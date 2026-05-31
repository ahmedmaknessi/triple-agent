import type { Player, WinResult, WinnerFaction, WinReason } from '@/types/game';

/** Build base faction outcomes: each player wins if their current_faction matches the winning side. */
function buildBaseOutcomes(
  players: Player[],
  winner: WinnerFaction,
): Record<string, 'WIN' | 'LOSE'> {
  const outcomes: Record<string, 'WIN' | 'LOSE'> = {};
  for (const p of players) {
    if (winner === 'SERVICE') {
      outcomes[p.id] = p.current_faction === 'SERVICE' ? 'WIN' : 'LOSE';
    } else if (winner === 'VIRUS') {
      outcomes[p.id] = p.current_faction === 'VIRUS' ? 'WIN' : 'LOSE';
    } else {
      outcomes[p.id] = 'LOSE';
    }
  }
  return outcomes;
}

/** Apply GRUDGE and INFATUATION agenda overrides on top of base outcomes. */
function applyAgendaOverrides(
  outcomes: Record<string, 'WIN' | 'LOSE'>,
  players: Player[],
  imprisonedId: string | null,
): Record<string, 'WIN' | 'LOSE'> {
  const result = { ...outcomes };
  for (const p of players) {
    if (p.hidden_agenda === 'GRUDGE') {
      result[p.id] =
        imprisonedId !== null && p.hidden_agenda_target_id === imprisonedId ? 'WIN' : 'LOSE';
    }
    if (p.hidden_agenda === 'INFATUATION') {
      // Infatuation holder wins if and only if their target is the imprisoned player (§5)
      result[p.id] =
        imprisonedId !== null && p.hidden_agenda_target_id === imprisonedId ? 'WIN' : 'LOSE';
    }
  }
  return result;
}

/**
 * Full win condition resolution per spec §4.6.
 * Players must have vote_target_id populated for the current round.
 */
export function resolveWinner(players: Player[]): WinResult {
  // ── 1. Tally votes ──────────────────────────────────────────────────────────
  const voteCounts: Record<string, number> = {};
  for (const p of players) {
    if (p.vote_target_id) {
      voteCounts[p.vote_target_id] = (voteCounts[p.vote_target_id] ?? 0) + 1;
    }
  }

  // ── 2. Find imprisoned player; tie → VIRUS wins ────────────────────────────
  const maxVotes = voteCounts && Object.keys(voteCounts).length > 0
    ? Math.max(...Object.values(voteCounts))
    : 0;
  const topVoted = Object.entries(voteCounts).filter(([, v]) => v === maxVotes);

  if (topVoted.length !== 1 || maxVotes === 0) {
    return {
      winner: 'VIRUS',
      reason: 'TIE_VOTE',
      imprisonedPlayerId: null,
      playerOutcomes: buildBaseOutcomes(players, 'VIRUS'),
    };
  }

  const imprisonedId = topVoted[0][0];
  const imprisoned   = players.find(p => p.id === imprisonedId)!;

  // ── 3. SCAPEGOAT: imprisoned player wins alone; all others lose ────────────
  if (imprisoned.hidden_agenda === 'SCAPEGOAT') {
    const outcomes: Record<string, 'WIN' | 'LOSE'> = {};
    for (const p of players) outcomes[p.id] = p.id === imprisonedId ? 'WIN' : 'LOSE';
    return {
      winner: 'INDIVIDUAL',
      reason: 'SCAPEGOAT',
      imprisonedPlayerId: imprisonedId,
      individualWinnerId: imprisonedId,
      playerOutcomes: outcomes,
    };
  }

  // ── 6. Triple Agent rule ────────────────────────────────────────────────────
  const tripleAgent = players.find(
    p => p.secret_role === 'TRIPLE_AGENT' && p.current_faction === 'VIRUS',
  );

  if (tripleAgent) {
    if (tripleAgent.id === imprisonedId) {
      // Triple Agent imprisoned → VIRUS wins
      const base = buildBaseOutcomes(players, 'VIRUS');
      return {
        winner: 'VIRUS',
        reason: 'TRIPLE_AGENT_IMPRISONED',
        imprisonedPlayerId: imprisonedId,
        playerOutcomes: applyAgendaOverrides(base, players, imprisonedId),
      };
    } else {
      // Any other VIRUS imprisoned → Service wins (Triple Agent rule overrides)
      if (imprisoned.current_faction === 'VIRUS') {
        const base = buildBaseOutcomes(players, 'SERVICE');
        return {
          winner: 'SERVICE',
          reason: 'TRIPLE_AGENT_SURVIVED',
          imprisonedPlayerId: imprisonedId,
          playerOutcomes: applyAgendaOverrides(base, players, imprisonedId),
        };
      }
    }
  }

  // ── 7. Standard resolution ──────────────────────────────────────────────────
  const standardWinner: WinnerFaction =
    imprisoned.current_faction === 'VIRUS' ? 'SERVICE' : 'VIRUS';
  const reason: WinReason =
    imprisoned.current_faction === 'VIRUS' ? 'IMPRISONED_VIRUS' : 'IMPRISONED_SERVICE';

  const base = buildBaseOutcomes(players, standardWinner);

  return {
    winner: standardWinner,
    reason,
    imprisonedPlayerId: imprisonedId,
    playerOutcomes: applyAgendaOverrides(base, players, imprisonedId),
  };
}
