import type {
  RoomRow,
  PlayerRow,
  PlayerUpdate,
  OperationLogRow,
  Faction,
  SecretRole,
  HiddenAgenda,
  RoomStatus,
} from './database';

export type { Faction, SecretRole, HiddenAgenda, RoomStatus };
export type { PlayerUpdate, OperationLogRow };

export type Room   = RoomRow;
export type Player = PlayerRow;

// ─── Operation execution ────────────────────────────────────────────────────

export interface ExecuteContext {
  activePlayer: Player;
  targetPlayer?: Player;
  secondTargetPlayer?: Player;
  allPlayers: Player[];
  operationLog?: OperationLogRow[];
  previousVotes?: Record<string, string>;
}

export interface OperationResult {
  success: boolean;
  privateMessage: string;
  playerMutations?: Array<{ id: string; changes: PlayerUpdate }>;
  deadDrop?: { recipientId: string; message: string };
}

export interface OperationDefinition {
  id: string;
  name: string;
  publicText: string;
  requiresTarget: boolean;
  requiresSecondTarget?: boolean;
  category: 'INFO' | 'MUTATE' | 'AGENDA';
  isExpansion: boolean;
  execute: (ctx: ExecuteContext) => OperationResult;
}

// ─── Win condition resolution ────────────────────────────────────────────────

export type WinnerFaction = 'SERVICE' | 'VIRUS' | 'INDIVIDUAL';

export type WinReason =
  | 'IMPRISONED_VIRUS'
  | 'IMPRISONED_SERVICE'
  | 'TIE_VOTE'
  | 'SCAPEGOAT'
  | 'TRIPLE_AGENT_IMPRISONED'
  | 'TRIPLE_AGENT_SURVIVED';

export interface WinResult {
  winner: WinnerFaction;
  reason: WinReason;
  imprisonedPlayerId: string | null;
  individualWinnerId?: string;
  playerOutcomes: Record<string, 'WIN' | 'LOSE'>;
}

// ─── Faction assignment ──────────────────────────────────────────────────────

export interface FactionAssignment {
  playerId: string;
  faction: Faction;
  secretRole: SecretRole | null;
}

export interface AssignOptions {
  useSecretRoles?: boolean;
}
