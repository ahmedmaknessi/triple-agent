import type { Player } from '@/types/game';

/**
 * Anti-cheat scrubber — spec §7.
 * Nulls all secret fields for players other than the requester.
 * Returns full data for the requesting player's own row, and after FINISHED.
 */
export function scrubPlayerForClient(
  requestingPlayerId: string,
  targetPlayer: Player,
  roomStatus: string,
): Partial<Player> {
  const isOwn      = targetPlayer.id === requestingPlayerId;
  const isFinished = roomStatus === 'FINISHED';

  if (isOwn || isFinished) return targetPlayer;

  return {
    ...targetPlayer,
    current_faction:          null,
    starting_faction:         null,
    secret_role:              null,
    hidden_agenda:            null,
    hidden_agenda_target_id:  null,
    operation_received:       null,
    operation_result:         null,
    vote_target_id:           null,
  };
}

/** Convenience: scrub an entire player list in one call. */
export function scrubPlayersForClient(
  requestingPlayerId: string,
  players: Player[],
  roomStatus: string,
): Partial<Player>[] {
  return players.map(p => scrubPlayerForClient(requestingPlayerId, p, roomStatus));
}
