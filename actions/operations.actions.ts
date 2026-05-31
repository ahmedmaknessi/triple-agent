'use server';

import { createServiceClient } from '@/lib/supabase/server';
import {
  OPERATIONS,
  drawOperationId,
  drawHiddenAgendaSubType,
  hiddenAgendaRequiresTarget,
  NO_OP_ID,
} from '@/lib/game/operations';
import type { Player, OperationLogRow } from '@/types/game';

const DISCUSSION_DURATION_MS = 2 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyTurn(
  supabase: ReturnType<typeof createServiceClient>,
  roomCode: string,
  playerToken: string,
) {
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomCode)
    .eq('local_storage_token', playerToken)
    .single();
  if (!player) throw new Error('Player not found');

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomCode)
    .single();
  if (!room) throw new Error('Room not found');
  if (room.status !== 'OPERATIONS') throw new Error('Not in OPERATIONS phase');
  if (room.current_turn_player_id !== player.id) throw new Error('Not your turn');

  return { player: player as Player, room };
}

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

/** Advance to the next player's turn, or start DISCUSSION if all have acted. */
async function advanceTurn(
  supabase: ReturnType<typeof createServiceClient>,
  roomCode: string,
) {
  const { data: players } = await supabase
    .from('players')
    .select('id, has_acted, join_order')
    .eq('room_id', roomCode)
    .order('join_order', { ascending: true });

  const next = players?.find(p => !p.has_acted) ?? null;

  if (next) {
    await supabase.from('rooms')
      .update({ current_turn_player_id: next.id })
      .eq('id', roomCode);
  } else {
    // All operations done → transition to DISCUSSION
    const timerEndsAt = new Date(Date.now() + DISCUSSION_DURATION_MS).toISOString();
    await supabase.from('rooms').update({
      status:                 'DISCUSSION',
      current_turn_player_id: null,
      timer_ends_at:          timerEndsAt,
    }).eq('id', roomCode);
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Called when the active player's screen loads.
 * Draws their operation (if not yet drawn) and delivers any pending dead drop messages.
 */
export async function drawOperation(
  roomCode: string,
  playerToken: string,
): Promise<{
  operationId: string;
  hiddenAgendaSubType?: string | null;
  deadDropMessage?: string | null;
}> {
  const supabase       = createServiceClient();
  const { player, room } = await verifyTurn(supabase, roomCode, playerToken);

  // Deliver any pending dead drop messages for this player
  let deadDropMessage: string | null = null;
  const { data: drops } = await supabase
    .from('dead_drop_messages')
    .select('id, message')
    .eq('room_id', roomCode)
    .eq('recipient_id', player.id)
    .eq('seen', false)
    .limit(1);

  if (drops?.[0]) {
    deadDropMessage = drops[0].message;
    await supabase.from('dead_drop_messages').update({ seen: true }).eq('id', drops[0].id);
  }

  // If operation already drawn (page refresh), return existing
  if (player.operation_received) {
    return {
      operationId:          player.operation_received,
      hiddenAgendaSubType:  player.hidden_agenda,
      deadDropMessage,
    };
  }

  // Count players for deck selection
  const { count: playerCount } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomCode);

  const operationId = drawOperationId(playerCount ?? 5);
  const updates: Partial<Player> = { operation_received: operationId };

  if (operationId === 'hidden_agenda') {
    updates.hidden_agenda = drawHiddenAgendaSubType();
  }

  await supabase.from('players').update(updates).eq('id', player.id);

  return {
    operationId,
    hiddenAgendaSubType: updates.hidden_agenda ?? null,
    deadDropMessage,
  };
}

/**
 * Active player confirms and executes their drawn operation.
 */
export async function executeOperation(
  roomCode: string,
  playerToken: string,
  targetPlayerId?: string,
  secondTargetId?: string,
): Promise<{ privateMessage: string }> {
  const supabase           = createServiceClient();
  const { player, room }   = await verifyTurn(supabase, roomCode, playerToken);

  if (player.has_acted) throw new Error('You have already acted this round');

  const operationId = player.operation_received;
  if (!operationId) throw new Error('No operation drawn yet');

  // No-op path (force skip fallback)
  if (operationId === NO_OP_ID) {
    await supabase.from('players').update({ has_acted: true }).eq('id', player.id);
    await advanceTurn(supabase, roomCode);
    return { privateMessage: 'Operation skipped.' };
  }

  const operation = OPERATIONS[operationId];
  if (!operation) throw new Error(`Unknown operation: ${operationId}`);

  // Fetch all players for context
  const { data: allPlayersRaw } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomCode);
  const allPlayers = (allPlayersRaw ?? []) as Player[];

  const targetPlayer       = targetPlayerId ? allPlayers.find(p => p.id === targetPlayerId) : undefined;
  const secondTargetPlayer = secondTargetId  ? allPlayers.find(p => p.id === secondTargetId)  : undefined;

  // Self-targeting guard (§9.D)
  if (targetPlayer?.id === player.id || secondTargetPlayer?.id === player.id) {
    throw new Error('Cannot target yourself');
  }

  // Fetch operation log for surveillance context
  const { data: logRaw } = await supabase
    .from('operation_log')
    .select('*')
    .eq('room_id', roomCode)
    .eq('round_number', room.round_number);
  const operationLog = (logRaw ?? []) as OperationLogRow[];

  // Execute the operation (pure function — no DB calls inside)
  const result = operation.execute({
    activePlayer: player,
    targetPlayer,
    secondTargetPlayer,
    allPlayers,
    operationLog,
  });

  // Apply player mutations
  if (result.playerMutations?.length) {
    for (const mutation of result.playerMutations) {
      await supabase.from('players').update(mutation.changes).eq('id', mutation.id);
    }
  }

  // Handle dead drop delivery
  if (result.deadDrop) {
    await supabase.from('dead_drop_messages').insert({
      room_id:      roomCode,
      recipient_id: result.deadDrop.recipientId,
      message:      result.deadDrop.message,
    });
  }

  // Log the operation (for surveillance + audit)
  await supabase.from('operation_log').insert({
    room_id:      roomCode,
    round_number: room.round_number,
    actor_id:     player.id,
    target_id:    targetPlayerId ?? null,
    operation_id: operationId,
  });

  // Store private result on player row
  await supabase.from('players').update({
    has_acted:        true,
    operation_result: { message: result.privateMessage, success: result.success },
  }).eq('id', player.id);

  await advanceTurn(supabase, roomCode);

  return { privateMessage: result.privateMessage };
}

/**
 * Host force-skips the current active player (§9.F — AFK deadlock).
 */
export async function forceSkip(roomCode: string, hostToken: string): Promise<void> {
  const supabase = createServiceClient();
  await verifyHost(supabase, roomCode, hostToken);

  const { data: room } = await supabase
    .from('rooms')
    .select('current_turn_player_id, status')
    .eq('id', roomCode)
    .single();

  if (!room || room.status !== 'OPERATIONS' || !room.current_turn_player_id) {
    throw new Error('No active player to skip');
  }

  await supabase.from('players').update({
    has_acted:           true,
    operation_received:  NO_OP_ID,
  }).eq('id', room.current_turn_player_id);

  await advanceTurn(supabase, roomCode);
}
