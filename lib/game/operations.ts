import type {
  OperationDefinition,
  OperationResult,
  ExecuteContext,
  Player,
  HiddenAgenda,
} from '@/types/game';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLoyalist(p: Player): boolean {
  return p.secret_role === 'SERVICE_LOYALIST' || p.secret_role === 'VIRUS_LOYALIST';
}

/**
 * Resolves the faction a player "appears" to be for INFO operations.
 * Respects Deep Cover (appears SERVICE) and Suspicious Agent (appears VIRUS).
 * If the player is burned, always returns their true current_faction.
 */
function apparentFaction(p: Player): 'SERVICE' | 'VIRUS' | null {
  if (p.is_burned) return p.current_faction;
  if (p.secret_role === 'DEEP_COVER')       return 'SERVICE';
  if (p.secret_role === 'SUSPICIOUS_AGENT') return 'VIRUS';
  return p.current_faction;
}

function factionLabel(faction: 'SERVICE' | 'VIRUS' | null): string {
  return faction === 'SERVICE' ? 'The Service' : faction === 'VIRUS' ? 'V.I.R.U.S.' : 'Unknown';
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── INFO Operations ──────────────────────────────────────────────────────────

const anonymousTip: OperationDefinition = {
  id: 'anonymous_tip',
  name: 'Anonymous Tip',
  publicText: "I've received an anonymous tip about one of you.",
  requiresTarget: true,
  category: 'INFO',
  isExpansion: false,
  execute({ activePlayer, targetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    const apparent = apparentFaction(targetPlayer);
    return {
      success: true,
      privateMessage: `${targetPlayer.name} appears to be ${factionLabel(apparent)}.`,
    };
  },
};

const oldPhotographs: OperationDefinition = {
  id: 'old_photographs',
  name: 'Old Photographs',
  publicText: "I found some old photographs from when we were all recruited.",
  requiresTarget: true,
  category: 'INFO',
  isExpansion: false,
  execute({ activePlayer, targetPlayer, allPlayers }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };

    const pool = allPlayers.filter(p => p.id !== activePlayer.id && p.id !== targetPlayer.id);
    const second = pool.length > 0 ? pick(pool) : null;

    const f1 = factionLabel(targetPlayer.starting_faction);
    let msg = `${targetPlayer.name} was originally recruited by ${f1}.`;
    if (second) {
      msg += ` ${second.name} was originally recruited by ${factionLabel(second.starting_faction)}.`;
    }
    return { success: true, privateMessage: msg };
  },
};

const backgroundCheck: OperationDefinition = {
  id: 'background_check',
  name: 'Background Check',
  publicText: "I ran a background check on one of you.",
  requiresTarget: true,
  category: 'INFO',
  isExpansion: false,
  execute({ targetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    return {
      success: true,
      privateMessage: `${targetPlayer.name} is a member of ${factionLabel(targetPlayer.current_faction)}.`,
    };
  },
};

const wireTap: OperationDefinition = {
  id: 'wire_tap',
  name: 'Wire Tap',
  publicText: "I've been monitoring someone's communications.",
  requiresTarget: true,
  category: 'INFO',
  isExpansion: false,
  execute({ activePlayer, targetPlayer, previousVotes }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    if (!previousVotes || Object.keys(previousVotes).length === 0) {
      return { success: true, privateMessage: 'No prior vote data available.' };
    }
    const voted = previousVotes[targetPlayer.id] === activePlayer.id;
    const msg = voted
      ? `${targetPlayer.name} voted to imprison you in the previous round.`
      : `${targetPlayer.name} did not vote to imprison you in the previous round.`;
    return { success: true, privateMessage: msg };
  },
};

const psychologicalProfile: OperationDefinition = {
  id: 'psychological_profile',
  name: 'Psychological Profile',
  publicText: "I've had a psych evaluation done on one of you.",
  requiresTarget: true,
  category: 'INFO',
  isExpansion: false,
  execute({ targetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    const has = targetPlayer.secret_role !== null;
    const msg = has
      ? `${targetPlayer.name} has a special designation.`
      : `${targetPlayer.name} has no special designation.`;
    return { success: true, privateMessage: msg };
  },
};

// ─── MUTATE Operations ────────────────────────────────────────────────────────

const defector: OperationDefinition = {
  id: 'defector',
  name: 'Defector',
  publicText: "I've turned one of you.",
  requiresTarget: true,
  category: 'MUTATE',
  isExpansion: false,
  execute({ targetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    if (isLoyalist(targetPlayer)) {
      return { success: false, privateMessage: 'Target is a Loyalist. Operation failed.' };
    }
    const newFaction = targetPlayer.current_faction === 'SERVICE' ? 'VIRUS' : 'SERVICE';
    return {
      success: true,
      privateMessage: `${targetPlayer.name} has been turned. They are now ${factionLabel(newFaction)}.`,
      playerMutations: [{ id: targetPlayer.id, changes: { current_faction: newFaction } }],
    };
  },
};

const deepUndercover: OperationDefinition = {
  id: 'deep_undercover',
  name: 'Deep Undercover',
  publicText: "I'm sending one of you deep undercover.",
  requiresTarget: true,
  category: 'MUTATE',
  isExpansion: false,
  execute({ targetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };

    if (isLoyalist(targetPlayer)) {
      return { success: false, privateMessage: 'Target is a Loyalist. Operation failed.' };
    }

    if (targetPlayer.secret_role === 'DEEP_COVER' || targetPlayer.secret_role === 'SUSPICIOUS_AGENT') {
      const roleLabel =
        targetPlayer.secret_role === 'DEEP_COVER' ? 'Deep Cover Agent' : 'Suspicious Agent';
      return {
        success: true,
        privateMessage: `${targetPlayer.name} has a special designation: ${roleLabel}. No faction change occurred.`,
      };
    }

    if (targetPlayer.current_faction === 'VIRUS') {
      return { success: true, privateMessage: `${targetPlayer.name} is already embedded.` };
    }

    return {
      success: true,
      privateMessage: `${targetPlayer.name} has been sent deep undercover. They are now V.I.R.U.S.`,
      playerMutations: [{ id: targetPlayer.id, changes: { current_faction: 'VIRUS' } }],
    };
  },
};

const covertExchange: OperationDefinition = {
  id: 'covert_exchange',
  name: 'Covert Exchange',
  publicText: "Two agents are being swapped.",
  requiresTarget: true,
  requiresSecondTarget: true,
  category: 'MUTATE',
  isExpansion: false,
  execute({ targetPlayer, secondTargetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer || !secondTargetPlayer) {
      return { success: false, privateMessage: 'Two targets required.' };
    }

    if (isLoyalist(targetPlayer) || isLoyalist(secondTargetPlayer)) {
      const loyalistName = isLoyalist(targetPlayer) ? targetPlayer.name : secondTargetPlayer.name;
      return {
        success: false,
        privateMessage: `${loyalistName} is a Loyalist. Both swaps cancelled. Operation failed.`,
      };
    }

    const f1 = targetPlayer.current_faction;
    const f2 = secondTargetPlayer.current_faction;
    return {
      success: true,
      privateMessage: `${targetPlayer.name} and ${secondTargetPlayer.name} have swapped allegiances.`,
      playerMutations: [
        { id: targetPlayer.id,       changes: { current_faction: f2 } },
        { id: secondTargetPlayer.id, changes: { current_faction: f1 } },
      ],
    };
  },
};

const burnNotice: OperationDefinition = {
  id: 'burn_notice',
  name: 'Burn Notice',
  publicText: "An agent's cover has been permanently blown.",
  requiresTarget: true,
  category: 'MUTATE',
  isExpansion: false,
  execute({ targetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    if (targetPlayer.is_burned) {
      return { success: true, privateMessage: `${targetPlayer.name} is already burned.` };
    }
    return {
      success: true,
      privateMessage: `${targetPlayer.name}'s cover has been permanently blown. Their true faction will be revealed on future Info operations.`,
      playerMutations: [{ id: targetPlayer.id, changes: { is_burned: true } }],
    };
  },
};

// ─── AGENDA Operations ────────────────────────────────────────────────────────

export const HIDDEN_AGENDA_SUB_TYPES: HiddenAgenda[] = [
  'SCAPEGOAT',
  'GRUDGE',
  'INFATUATION',
  'SLEEPER_AGENT',
  'SECRET_TIP',
];

/** Returns true if the sub-type requires the player to select a target before confirming. */
export function hiddenAgendaRequiresTarget(subType: HiddenAgenda): boolean {
  return subType === 'GRUDGE' || subType === 'INFATUATION' || subType === 'SECRET_TIP';
}

const hiddenAgenda: OperationDefinition = {
  id: 'hidden_agenda',
  name: 'Hidden Agenda',
  publicText: "I have my own agenda in all of this.",
  requiresTarget: false, // UI checks hiddenAgendaRequiresTarget() per sub-type
  category: 'AGENDA',
  isExpansion: false,
  execute({ activePlayer, targetPlayer }: ExecuteContext): OperationResult {
    const sub = activePlayer.hidden_agenda;
    if (!sub) return { success: false, privateMessage: 'No agenda sub-type assigned.' };

    switch (sub) {
      case 'SCAPEGOAT':
        return {
          success: true,
          privateMessage:
            'Operation Scapegoat activated. You win only if you are the one imprisoned.',
        };

      case 'GRUDGE': {
        if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
        return {
          success: true,
          privateMessage: `Grudge locked onto ${targetPlayer.name}. You win only if they are imprisoned.`,
          playerMutations: [
            { id: activePlayer.id, changes: { hidden_agenda_target_id: targetPlayer.id } },
          ],
        };
      }

      case 'INFATUATION': {
        if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
        return {
          success: true,
          privateMessage: `Infatuation locked onto ${targetPlayer.name}. You win if and only if they are imprisoned — even if you are too.`,
          playerMutations: [
            { id: activePlayer.id, changes: { hidden_agenda_target_id: targetPlayer.id } },
          ],
        };
      }

      case 'SLEEPER_AGENT': {
        // Sleeper Agent IS self-initiated — affects Loyalists too
        const newFaction = activePlayer.current_faction === 'SERVICE' ? 'VIRUS' : 'SERVICE';
        return {
          success: true,
          privateMessage: `Sleeper protocol activated. Your allegiance has shifted to ${factionLabel(newFaction)}.`,
          playerMutations: [
            { id: activePlayer.id, changes: { current_faction: newFaction } },
          ],
        };
      }

      case 'SECRET_TIP': {
        if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
        return {
          success: true,
          privateMessage: `Secret Tip: ${targetPlayer.name} is a member of ${factionLabel(targetPlayer.current_faction)}.`,
        };
      }

      default:
        return { success: false, privateMessage: 'Unknown agenda type.' };
    }
  },
};

// ─── EXPANSION Operations ─────────────────────────────────────────────────────

const surveillance: OperationDefinition = {
  id: 'surveillance',
  name: 'Surveillance',
  publicText: "I've had eyes on someone for a while.",
  requiresTarget: true,
  category: 'INFO',
  isExpansion: true,
  execute({ targetPlayer, operationLog }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    const entries = (operationLog ?? []).filter(e => e.target_id === targetPlayer.id);
    if (entries.length === 0) {
      return {
        success: true,
        privateMessage: `${targetPlayer.name} has not been targeted by any operation this round.`,
      };
    }
    const names = entries.map(e => e.operation_id.replace(/_/g, ' ').toUpperCase()).join(', ');
    return {
      success: true,
      privateMessage: `Operations targeting ${targetPlayer.name}: ${names}.`,
    };
  },
};

const deadDrop: OperationDefinition = {
  id: 'dead_drop',
  name: 'Dead Drop',
  publicText: "I left something for one of you.",
  requiresTarget: true,
  category: 'MUTATE',
  isExpansion: true,
  execute({ activePlayer, targetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer) return { success: false, privateMessage: 'No target selected.' };
    const message =
      activePlayer.current_faction === 'SERVICE'
        ? 'You have been contacted by a Service ally. Trust your instincts.'
        : 'A V.I.R.U.S. agent has marked you. Watch your back.';
    return {
      success: true,
      privateMessage: `Dead drop delivered to ${targetPlayer.name}. They will receive it on their next turn.`,
      deadDrop: { recipientId: targetPlayer.id, message },
    };
  },
};

const loyaltyTest: OperationDefinition = {
  id: 'loyalty_test',
  name: 'Loyalty Test',
  publicText: "I administered a loyalty test.",
  requiresTarget: true,
  requiresSecondTarget: true,
  category: 'INFO',
  isExpansion: true,
  execute({ targetPlayer, secondTargetPlayer }: ExecuteContext): OperationResult {
    if (!targetPlayer || !secondTargetPlayer) {
      return { success: false, privateMessage: 'Two targets required.' };
    }

    const t1Stable = targetPlayer.current_faction === targetPlayer.starting_faction;
    const t2Stable = secondTargetPlayer.current_faction === secondTargetPlayer.starting_faction;

    if (t1Stable && !t2Stable) {
      return {
        success: true,
        privateMessage: `${targetPlayer.name} has remained on the same team since recruitment.`,
      };
    }
    if (!t1Stable && t2Stable) {
      return {
        success: true,
        privateMessage: `${secondTargetPlayer.name} has remained on the same team since recruitment.`,
      };
    }
    return { success: true, privateMessage: 'Inconclusive.' };
  },
};

// ─── Registry & deck ─────────────────────────────────────────────────────────

export const OPERATIONS: Record<string, OperationDefinition> = {
  anonymous_tip:         anonymousTip,
  old_photographs:       oldPhotographs,
  background_check:      backgroundCheck,
  wire_tap:              wireTap,
  psychological_profile: psychologicalProfile,
  defector:              defector,
  deep_undercover:       deepUndercover,
  covert_exchange:       covertExchange,
  burn_notice:           burnNotice,
  hidden_agenda:         hiddenAgenda,
  surveillance:          surveillance,
  dead_drop:             deadDrop,
  loyalty_test:          loyaltyTest,
};

/** Base 12-card deck (hidden_agenda appears 3×) */
const BASE_DECK: string[] = [
  'anonymous_tip',
  'old_photographs',
  'background_check',
  'wire_tap',
  'psychological_profile',
  'defector',
  'deep_undercover',
  'covert_exchange',
  'burn_notice',
  'hidden_agenda',
  'hidden_agenda',
  'hidden_agenda',
];

/** 3 expansion operations added for 8+ players */
const EXPANSION_DECK: string[] = ['surveillance', 'dead_drop', 'loyalty_test'];

/** Returns the full pool of operation IDs to draw from. */
export function getOperationPool(playerCount: number): string[] {
  if (playerCount >= 8) return [...BASE_DECK, ...EXPANSION_DECK];
  return [...BASE_DECK];
}

/** Draw a random operation ID from the pool. */
export function drawOperationId(playerCount: number): string {
  const pool = getOperationPool(playerCount);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Pick a random Hidden Agenda sub-type. */
export function drawHiddenAgendaSubType(): HiddenAgenda {
  return HIDDEN_AGENDA_SUB_TYPES[Math.floor(Math.random() * HIDDEN_AGENDA_SUB_TYPES.length)];
}

/** No-op operation for AFK force-skip (§9.F) */
export const NO_OP_ID = 'no_op';
