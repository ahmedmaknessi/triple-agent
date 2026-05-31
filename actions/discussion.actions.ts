'use server';

import { createServiceClient } from '@/lib/supabase/server';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyHost(
  supabase: ReturnType<typeof createServiceClient>,
  roomCode: string,
  hostToken: string,
) {
  const { data: p } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', roomCode)
    .eq('local_storage_token', hostToken)
    .single();
  const { data: r } = await supabase.from('rooms').select('*').eq('id', roomCode).single();
  if (!p || !r || r.host_id !== p.id) throw new Error('Not authorized');
  return { room: r };
}

const VOTING_DURATION_MS = 60 * 1000;

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Any player can request a pause — stores the request pending host approval.
 * paused_by format before approval: "PlayerName"
 */
export async function requestPause(roomCode: string, playerToken: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('status, paused_by')
    .eq('id', roomCode)
    .single();
  if (!room || room.status !== 'DISCUSSION') throw new Error('Not in DISCUSSION phase');
  if (room.paused_by) throw new Error('Pause already pending or active');

  const { data: player } = await supabase
    .from('players')
    .select('name')
    .eq('room_id', roomCode)
    .eq('local_storage_token', playerToken)
    .single();
  if (!player) throw new Error('Player not found');

  await supabase.from('rooms').update({ paused_by: player.name }).eq('id', roomCode);
}

/**
 * Host approves a pending pause request.
 * Encodes remaining ms into paused_by so the timer can be restored on resume.
 * paused_by format when active: "PlayerName:remainingMs"
 */
export async function approvePause(roomCode: string, hostToken: string): Promise<void> {
  const supabase    = createServiceClient();
  const { room }    = await verifyHost(supabase, roomCode, hostToken);

  if (room.status !== 'DISCUSSION') throw new Error('Not in DISCUSSION phase');
  if (!room.paused_by) throw new Error('No pause request pending');
  if (room.paused_by.includes(':')) throw new Error('Already paused');

  const remainingMs = Math.max(0, new Date(room.timer_ends_at!).getTime() - Date.now());
  const encoded     = `${room.paused_by}:${remainingMs}`;
  // Set timer_ends_at to far future so the server-side check doesn't auto-advance
  const farFuture   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('rooms').update({
    paused_by:     encoded,
    timer_ends_at: farFuture,
  }).eq('id', roomCode);
}

/**
 * Host resumes the timer after approving a pause.
 * Decodes remaining ms from paused_by and restores timer_ends_at.
 */
export async function resumeTimer(roomCode: string, hostToken: string): Promise<void> {
  const supabase = createServiceClient();
  const { room } = await verifyHost(supabase, roomCode, hostToken);

  if (room.status !== 'DISCUSSION') throw new Error('Not in DISCUSSION phase');
  if (!room.paused_by?.includes(':')) throw new Error('Timer is not paused');

  const parts       = room.paused_by.split(':');
  const remainingMs = parseInt(parts[parts.length - 1], 10);
  const timerEndsAt = new Date(Date.now() + remainingMs).toISOString();

  await supabase.from('rooms').update({
    paused_by:     null,
    timer_ends_at: timerEndsAt,
  }).eq('id', roomCode);
}

/**
 * Polled by /api/game route — advances DISCUSSION → VOTING when timer expires.
 */
export async function checkDiscussionExpiry(roomCode: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('status, timer_ends_at, paused_by')
    .eq('id', roomCode)
    .single();

  if (!room || room.status !== 'DISCUSSION') return false;
  if (room.paused_by) return false; // timer is paused
  if (!room.timer_ends_at) return false;
  if (new Date(room.timer_ends_at).getTime() > Date.now()) return false;

  const timerEndsAt = new Date(Date.now() + VOTING_DURATION_MS).toISOString();
  await supabase.from('rooms').update({
    status:        'VOTING',
    timer_ends_at: timerEndsAt,
    paused_by:     null,
  }).eq('id', roomCode);

  return true;
}
