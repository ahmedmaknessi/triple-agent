import type { Player, SecretRole } from '@/types/game';

export interface TeammateResult {
  teammates: Pick<Player, 'id' | 'name'>[];
}

/** Exact algorithm from spec §4.3 */
export function getTeammateList(player: Player, allPlayers: Player[]): TeammateResult {
  if (player.current_faction !== 'VIRUS') return { teammates: [] };

  const teammates = allPlayers.filter(p => {
    const isVirus   = p.current_faction === 'VIRUS';
    const isNotMe   = p.id !== player.id;
    // Rogue sees all VIRUS. If active player is NOT Rogue, hide the Rogue.
    const hideRogue =
      player.secret_role !== 'ROGUE_AGENT'
        ? p.secret_role !== 'ROGUE_AGENT'
        : true;

    return isVirus && isNotMe && hideRogue;
  });

  return { teammates: teammates.map(p => ({ id: p.id, name: p.name })) };
}

const ROLE_LABELS: Record<SecretRole, string> = {
  SERVICE_LOYALIST: 'Service Loyalist',
  VIRUS_LOYALIST:   'V.I.R.U.S. Loyalist',
  DEEP_COVER:       'Deep Cover Agent',
  SUSPICIOUS_AGENT: 'Suspicious Agent',
  TRIPLE_AGENT:     'Triple Agent',
  ROGUE_AGENT:      'Rogue Agent',
};

const ROLE_DESCRIPTIONS: Record<SecretRole, string> = {
  SERVICE_LOYALIST:
    'Your allegiance cannot be changed by any operation. You are immune to faction-switching, but vulnerable to Hidden Agenda mutations.',
  VIRUS_LOYALIST:
    'Your allegiance cannot be changed by any operation. You are immune to faction-switching, but vulnerable to Hidden Agenda mutations.',
  DEEP_COVER:
    'You are V.I.R.U.S., but you appear as The Service to all Info operations. Your teammates know your true allegiance.',
  SUSPICIOUS_AGENT:
    'You are The Service, but you appear as V.I.R.U.S. to all Info operations. Prove your innocence through discussion.',
  TRIPLE_AGENT:
    'You are V.I.R.U.S., secretly working against them. V.I.R.U.S. wins ONLY if you are the one imprisoned.',
  ROGUE_AGENT:
    'You are V.I.R.U.S., operating alone. You can see all other V.I.R.U.S. agents, but they cannot see you.',
};

export function getRoleLabel(role: SecretRole): string {
  return ROLE_LABELS[role];
}

export function getRoleDescription(role: SecretRole): string {
  return ROLE_DESCRIPTIONS[role];
}
