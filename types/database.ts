export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type RoomStatus = 'LOBBY' | 'BRIEFING' | 'OPERATIONS' | 'DISCUSSION' | 'VOTING' | 'FINISHED';
export type Faction = 'SERVICE' | 'VIRUS';
export type SecretRole =
  | 'SERVICE_LOYALIST'
  | 'VIRUS_LOYALIST'
  | 'DEEP_COVER'
  | 'SUSPICIOUS_AGENT'
  | 'TRIPLE_AGENT'
  | 'ROGUE_AGENT';
export type HiddenAgenda =
  | 'SCAPEGOAT'
  | 'GRUDGE'
  | 'INFATUATION'
  | 'SLEEPER_AGENT'
  | 'SECRET_TIP';

// ─── Row types ────────────────────────────────────────────────────────────────
// All Row types must extend Record<string, unknown> so Supabase's GenericTable
// constraint is satisfied — the index signature is required by supabase-js.

export interface RoomRow {
  id: string;
  host_id: string | null;
  status: RoomStatus;
  paused_by: string | null;
  timer_ends_at: string | null;
  kicked_players: string[];
  current_turn_player_id: string | null;
  round_number: number;
  created_at: string;
  [key: string]: unknown;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  local_storage_token: string;
  name: string;
  join_order: number | null;
  current_faction: Faction | null;
  starting_faction: Faction | null;
  secret_role: SecretRole | null;
  hidden_agenda: HiddenAgenda | null;
  hidden_agenda_target_id: string | null;
  has_acted: boolean;
  vote_target_id: string | null;
  is_online: boolean;
  is_burned: boolean;
  briefed: boolean;
  operation_received: string | null;
  operation_result: Json | null;
  created_at: string;
  [key: string]: unknown;
}

export interface OperationLogRow {
  id: string;
  room_id: string;
  round_number: number | null;
  actor_id: string | null;
  target_id: string | null;
  operation_id: string;
  created_at: string;
  [key: string]: unknown;
}

export interface DeadDropRow {
  id: string;
  room_id: string;
  recipient_id: string;
  message: string;
  seen: boolean;
  created_at: string;
  [key: string]: unknown;
}

// ─── Insert types ─────────────────────────────────────────────────────────────

export interface RoomInsert {
  id: string;
  host_id?: string | null;
  status?: RoomStatus;
  paused_by?: string | null;
  timer_ends_at?: string | null;
  kicked_players?: string[];
  current_turn_player_id?: string | null;
  round_number?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface PlayerInsert {
  id?: string;
  room_id: string;
  local_storage_token: string;
  name: string;
  join_order?: number | null;
  current_faction?: Faction | null;
  starting_faction?: Faction | null;
  secret_role?: SecretRole | null;
  hidden_agenda?: HiddenAgenda | null;
  hidden_agenda_target_id?: string | null;
  has_acted?: boolean;
  vote_target_id?: string | null;
  is_online?: boolean;
  is_burned?: boolean;
  briefed?: boolean;
  operation_received?: string | null;
  operation_result?: Json | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface OperationLogInsert {
  id?: string;
  room_id: string;
  round_number?: number | null;
  actor_id?: string | null;
  target_id?: string | null;
  operation_id: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface DeadDropInsert {
  id?: string;
  room_id: string;
  recipient_id: string;
  message: string;
  seen?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

// ─── Update types (all fields optional) ──────────────────────────────────────

export interface RoomUpdate {
  id?: string;
  host_id?: string | null;
  status?: RoomStatus;
  paused_by?: string | null;
  timer_ends_at?: string | null;
  kicked_players?: string[];
  current_turn_player_id?: string | null;
  round_number?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface PlayerUpdate {
  id?: string;
  room_id?: string;
  local_storage_token?: string;
  name?: string;
  join_order?: number | null;
  current_faction?: Faction | null;
  starting_faction?: Faction | null;
  secret_role?: SecretRole | null;
  hidden_agenda?: HiddenAgenda | null;
  hidden_agenda_target_id?: string | null;
  has_acted?: boolean;
  vote_target_id?: string | null;
  is_online?: boolean;
  is_burned?: boolean;
  briefed?: boolean;
  operation_received?: string | null;
  operation_result?: Json | null;
  created_at?: string;
  [key: string]: unknown;
}

// ─── Supabase Database type ───────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: RoomRow;
        Insert: RoomInsert;
        Update: RoomUpdate;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: PlayerInsert;
        Update: PlayerUpdate;
        Relationships: [];
      };
      operation_log: {
        Row: OperationLogRow;
        Insert: OperationLogInsert;
        Update: {
          id?: string;
          room_id?: string;
          round_number?: number | null;
          actor_id?: string | null;
          target_id?: string | null;
          operation_id?: string;
          created_at?: string;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      dead_drop_messages: {
        Row: DeadDropRow;
        Insert: DeadDropInsert;
        Update: {
          id?: string;
          room_id?: string;
          recipient_id?: string;
          message?: string;
          seen?: boolean;
          created_at?: string;
          [key: string]: unknown;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
  };
}
