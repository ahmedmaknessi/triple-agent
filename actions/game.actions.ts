'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { assignFactionsAndRoles } from '@/lib/game/faction-assignment';

async function verifyHost(
  supabase: ReturnType<typeof createServiceClient>,
  roomCode: string,
  hostToken: string,
) {
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', roomCode)
    .eq('local_storage_token', hostToken)
    .single();

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomCode)
    .single();

  if (!player || !room || room.host_id !== player.id) throw new Error('Not authorized');
  return { player, room };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Host starts the game: assigns factions, transitions to BRIEFING.
 */
export async function startGame(roomCode: string, hostToken: string): Promise<void> {
  const supabase      = createServiceClient();
  const { room }      = await verifyHost(supabase, roomCode, hostToken);

  if (room.status !== 'LOBBY') throw new Error('Game is not in LOBBY');

  const { data: players, error } = await supabase
    .from('players')
    .select('id, join_order')
    .eq('room_id', roomCode)
    .order('join_order', { ascending: true });

  if (error || !players) throw new Error('Failed to fetch players');
  if (players.length < 5)  throw new Error('Need at least 5 players to start');
  if (players.length > 12) throw new Error('Maximum 12 players allowed');

  const assignments = assignFactionsAndRoles(players.map(p => p.id), { useSecretRoles: true });

  // Apply to each player
  for (const a of assignments) {
    await supabase.from('players').update({
      current_faction:         a.faction,
      starting_faction:        a.faction,
      secret_role:             a.secretRole,
      hidden_agenda:           null,
      hidden_agenda_target_id: null,
      briefed:                 false,
      has_acted:               false,
      vote_target_id:          null,
      operation_received:      null,
      operation_result:        null,
      is_burned:               false,
    }).eq('id', a.playerId);
  }

  // Transition to BRIEFING; first player in join_order is briefed first
  await supabase.from('rooms').update({
    status:                  'BRIEFING',
    current_turn_player_id:  players[0].id,
    round_number:            1,
    timer_ends_at:           null,
    paused_by:               null,
  }).eq('id', roomCode);
}

/**
 * Active player holds CONFIRM for 2 s → marks themselves briefed, advances cursor.
 */
export async function confirmBriefing(roomCode: string, playerToken: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, join_order')
    .eq('room_id', roomCode)
    .eq('local_storage_token', playerToken)
    .single();
  if (!player) throw new Error('Player not found');

  // Verify it's actually this player's briefing turn
  const { data: room } = await supabase
    .from('rooms')
    .select('current_turn_player_id, status')
    .eq('id', roomCode)
    .single();
  if (!room || room.status !== 'BRIEFING') throw new Error('Not in BRIEFING phase');
  if (room.current_turn_player_id !== player.id) throw new Error('Not your turn to be briefed');

  await supabase.from('players').update({ briefed: true }).eq('id', player.id);

  // Find next unbriefed player in join_order
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, briefed, join_order')
    .eq('room_id', roomCode)
    .order('join_order', { ascending: true });

  const next = allPlayers?.find(p => !p.briefed);
  await supabase.from('rooms').update({
    current_turn_player_id: next?.id ?? null,
  }).eq('id', roomCode);
}

/**
 * Host advances from BRIEFING → OPERATIONS after all players are briefed.
 */
export async function startOperations(roomCode: string, hostToken: string): Promise<void> {
  const supabase = createServiceClient();
  await verifyHost(supabase, roomCode, hostToken);

  const { data: players } = await supabase
    .from('players')
    .select('id, briefed, join_order')
    .eq('room_id', roomCode)
    .order('join_order', { ascending: true });

  if (!players || players.length === 0) throw new Error('No players found');
  if (players.some(p => !p.briefed)) throw new Error('Not all players have been briefed');

  await supabase.from('rooms').update({
    status:                 'OPERATIONS',
    current_turn_player_id: players[0].id,
  }).eq('id', roomCode);
}

/**
 * Host resets room to LOBBY for a new game (same players, cleared game state).
 */
export async function resetRoom(roomCode: string, hostToken: string): Promise<void> {
  const supabase = createServiceClient();
  await verifyHost(supabase, roomCode, hostToken);

  await supabase.from('players').update({
    current_faction:         null,
    starting_faction:        null,
    secret_role:             null,
    hidden_agenda:           null,
    hidden_agenda_target_id: null,
    has_acted:               false,
    vote_target_id:          null,
    is_burned:               false,
    briefed:                 false,
    operation_received:      null,
    operation_result:        null,
  }).eq('room_id', roomCode);

  await supabase.from('operation_log').delete().eq('room_id', roomCode);
  await supabase.from('dead_drop_messages').delete().eq('room_id', roomCode);

  await supabase.from('rooms').update({
    status:                 'LOBBY',
    current_turn_player_id: null,
    timer_ends_at:          null,
    paused_by:              null,
    round_number:           1,
    previous_votes:         null,
  }).eq('id', roomCode);
}
