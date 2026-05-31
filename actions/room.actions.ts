'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { generateRoomCode } from '@/lib/utils/room-code';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getRoom(supabase: ReturnType<typeof createServiceClient>, code: string) {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', code).single();
  if (error || !data) throw new Error('Room not found');
  return data;
}

async function getPlayerByToken(
  supabase: ReturnType<typeof createServiceClient>,
  roomCode: string,
  token: string,
) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomCode)
    .eq('local_storage_token', token)
    .single();
  if (error || !data) throw new Error('Player not found');
  return data;
}

async function verifyHost(
  supabase: ReturnType<typeof createServiceClient>,
  roomCode: string,
  hostToken: string,
) {
  const player = await getPlayerByToken(supabase, roomCode, hostToken);
  const room   = await getRoom(supabase, roomCode);
  if (room.host_id !== player.id) throw new Error('Not authorized');
  return { player, room };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createRoom(
  playerName: string,
  playerToken: string,
): Promise<{ code: string; playerId: string } | { error: string }> {
  try {
    const supabase = createServiceClient();

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id, room_id')
      .eq('local_storage_token', playerToken)
      .maybeSingle();

    if (existingPlayer) {
      const { data: existingRoom } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('id', existingPlayer.room_id)
        .maybeSingle();

      if (existingRoom && existingRoom.status !== 'FINISHED') {
        if (existingRoom.status === 'LOBBY') {
          return { code: existingRoom.id, playerId: existingPlayer.id };
        }
        return { error: 'You are already in an active game. Rejoin via your room link.' };
      }

      await supabase.from('players').delete().eq('id', existingPlayer.id);
    }

    let code = '';
    for (let i = 0; i < 10; i++) {
      const candidate = generateRoomCode();
      const { data } = await supabase.from('rooms').select('id').eq('id', candidate).maybeSingle();
      if (!data) { code = candidate; break; }
    }
    if (!code) return { error: 'Failed to generate unique room code. Try again.' };

    const { error: roomErr } = await supabase.from('rooms').insert({ id: code });
    if (roomErr) return { error: `Failed to create room: ${roomErr.message}` };

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ room_id: code, local_storage_token: playerToken, name: playerName, join_order: 1 })
      .select()
      .single();
    if (playerErr || !player) return { error: `Failed to create player: ${playerErr?.message ?? 'unknown'}` };

    await supabase.from('rooms').update({ host_id: player.id }).eq('id', code);

    return { code, playerId: player.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unexpected error creating room' };
  }
}

export async function joinRoom(
  code: string,
  playerName: string,
  playerToken: string,
): Promise<{ code: string; playerId: string } | { error: string }> {
  try {
    const supabase = createServiceClient();

    const { data: room } = await supabase.from('rooms').select('*').eq('id', code).maybeSingle();
    if (!room) return { error: 'Room not found. Check the code and try again.' };
    if (room.status !== 'LOBBY') return { error: 'Game already in progress.' };
    if ((room.kicked_players as string[]).includes(playerToken)) return { error: 'You have been removed from this session by the host.' };

    // Seamless rejoin if token already exists in this room
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', code)
      .eq('local_storage_token', playerToken)
      .maybeSingle();
    if (existing) return { code, playerId: existing.id };

    // Check capacity
    const { count } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', code);
    if ((count ?? 0) >= 12) return { error: 'Room is full (max 12 players).' };

    const joinOrder = (count ?? 0) + 1;

    const { data: player, error } = await supabase
      .from('players')
      .insert({ room_id: code, local_storage_token: playerToken, name: playerName, join_order: joinOrder })
      .select()
      .single();
    if (error || !player) return { error: `Failed to join room: ${error?.message ?? 'unknown'}` };

    return { code, playerId: player.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unexpected error joining room' };
  }
}

export async function kickPlayer(
  roomCode: string,
  hostToken: string,
  targetPlayerId: string,
): Promise<void> {
  const supabase        = createServiceClient();
  const { room }        = await verifyHost(supabase, roomCode, hostToken);

  const { data: target } = await supabase
    .from('players')
    .select('local_storage_token')
    .eq('id', targetPlayerId)
    .single();
  if (!target) throw new Error('Player not found');

  await supabase.from('rooms').update({
    kicked_players: [...room.kicked_players, target.local_storage_token],
  }).eq('id', roomCode);

  await supabase.from('players').delete().eq('id', targetPlayerId);
}

/** Spec §9.A — called by usePresence when host drops for > 10 s */
export async function handleHostDisconnect(
  roomCode: string,
  droppedPlayerId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: players } = await supabase
    .from('players')
    .select('id, join_order')
    .eq('room_id', roomCode)
    .eq('is_online', true)
    .neq('id', droppedPlayerId)
    .order('join_order', { ascending: true })
    .limit(1);

  if (players?.[0]) {
    await supabase.from('rooms').update({ host_id: players[0].id }).eq('id', roomCode);
  }
}

export async function updateOnlineStatus(
  roomCode: string,
  playerToken: string,
  isOnline: boolean,
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from('players')
    .update({ is_online: isOnline })
    .eq('room_id', roomCode)
    .eq('local_storage_token', playerToken);
}
