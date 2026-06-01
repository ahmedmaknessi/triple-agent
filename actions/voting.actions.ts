'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { resolveWinner } from '@/lib/game/win-conditions';
import type { Player } from '@/types/game';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Spec §9.H — tie-break logic (also handles the full tally). */
async function runTally(
  supabase: ReturnType<typeof createServiceClient>,
  roomCode: string,
): Promise<void> {
  const { data: playersRaw } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomCode);
  const players = (playersRaw ?? []) as Player[];

  resolveWinner(players);

  // Snapshot vote_target_id values so wire_tap can read them in subsequent rounds
  const previousVotes: Record<string, string> = {};
  for (const p of players) {
    if (p.vote_target_id) previousVotes[p.id] = p.vote_target_id;
  }

  await supabase.from('rooms').update({
    status:         'FINISHED',
    paused_by:      null,
    previous_votes: previousVotes,
  }).eq('id', roomCode);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Player casts their secret vote.
 */
export async function submitVote(
  roomCode: string,
  playerToken: string,
  targetPlayerId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, vote_target_id')
    .eq('room_id', roomCode)
    .eq('local_storage_token', playerToken)
    .single();
  if (!player) throw new Error('Player not found');

  const { data: room } = await supabase
    .from('rooms')
    .select('status, timer_ends_at')
    .eq('id', roomCode)
    .single();
  if (!room || room.status !== 'VOTING') throw new Error('Not in VOTING phase');

  // Check timer hasn't expired
  if (room.timer_ends_at && new Date(room.timer_ends_at).getTime() < Date.now()) {
    throw new Error('Voting has ended');
  }

  // Self-vote guard
  if (targetPlayerId === player.id) throw new Error('Cannot vote for yourself');

  // Idempotent — don't allow changing vote once cast
  if (player.vote_target_id) throw new Error('You have already voted');

  await supabase.from('players').update({ vote_target_id: targetPlayerId }).eq('id', player.id);

  // If all players have voted, tally immediately
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, vote_target_id')
    .eq('room_id', roomCode);

  const allVoted = allPlayers?.every(p => p.vote_target_id !== null);
  if (allVoted) await runTally(supabase, roomCode);
}

/**
 * Polled by /api/game route — tallies votes when the 60-second timer expires.
 */
export async function checkVotingExpiry(roomCode: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('status, timer_ends_at')
    .eq('id', roomCode)
    .single();

  if (!room || room.status !== 'VOTING') return false;
  if (!room.timer_ends_at) return false;
  if (new Date(room.timer_ends_at).getTime() > Date.now()) return false;

  await runTally(supabase, roomCode);
  return true;
}

/**
 * Returns the resolved winner for a FINISHED room (computed from player vote data).
 */
export async function getGameResult(roomCode: string) {
  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('status')
    .eq('id', roomCode)
    .single();
  if (!room || room.status !== 'FINISHED') throw new Error('Game not finished');

  const { data: playersRaw } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomCode);
  const players = (playersRaw ?? []) as Player[];

  return resolveWinner(players);
}
