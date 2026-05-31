import type { Faction, SecretRole, FactionAssignment, AssignOptions } from '@/types/game';

/** Spec §4.1: VIRUS count by player count. */
function virusCount(playerCount: number): number {
  if (playerCount <= 6) return 2;
  if (playerCount <= 9) return 3;
  // 10–12: randomly 3 or 4
  return Math.random() < 0.5 ? 3 : 4;
}

/** Fisher-Yates shuffle (in-place). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SERVICE_ROLES: SecretRole[] = ['SERVICE_LOYALIST', 'SUSPICIOUS_AGENT'];
const VIRUS_ROLES:   SecretRole[] = ['VIRUS_LOYALIST', 'DEEP_COVER', 'TRIPLE_AGENT', 'ROGUE_AGENT'];

/**
 * Assigns factions (and optionally secret roles) to a list of player IDs.
 * Does NOT hit the database — returns pure assignment data for the Server Action to apply.
 */
export function assignFactionsAndRoles(
  playerIds: string[],
  options: AssignOptions = {},
): FactionAssignment[] {
  const count        = playerIds.length;
  const nVirus       = virusCount(count);
  const shuffled     = shuffle([...playerIds]);
  const virusSet     = new Set(shuffled.slice(0, nVirus));

  const assignments: FactionAssignment[] = shuffled.map(id => ({
    playerId:   id,
    faction:    virusSet.has(id) ? 'VIRUS' : 'SERVICE',
    secretRole: null,
  }));

  if (!options.useSecretRoles) return assignments;

  // Assign at most 1 SERVICE-side role and 1 VIRUS-side role per game.
  const servicePlayers = assignments.filter(a => a.faction === 'SERVICE');
  const virusPlayers   = assignments.filter(a => a.faction === 'VIRUS');

  if (servicePlayers.length > 0) {
    const chosen    = pick(servicePlayers);
    chosen.secretRole = pick(SERVICE_ROLES);
  }

  if (virusPlayers.length > 0) {
    const chosen    = pick(virusPlayers);
    chosen.secretRole = pick(VIRUS_ROLES);
  }

  return assignments;
}
