-- =============================================================
-- Triple Agent — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- =============================================================

-- ROOMS TABLE
create table rooms (
  id                    text primary key,
  host_id               uuid,
  status                text not null default 'LOBBY'
                          check (status in ('LOBBY','BRIEFING','OPERATIONS','DISCUSSION','VOTING','FINISHED')),
  paused_by             text,
  timer_ends_at         timestamptz,
  kicked_players        text[] default '{}',
  current_turn_player_id uuid,
  round_number          int default 1,
  previous_votes        jsonb,                           -- snapshot of vote_target_id map from last round
  created_at            timestamptz default now()
);

-- Migration (run if upgrading an existing DB):
-- alter table rooms add column if not exists previous_votes jsonb;

-- PLAYERS TABLE
create table players (
  id                    uuid primary key default gen_random_uuid(),
  room_id               text references rooms(id) on delete cascade,
  local_storage_token   text not null unique,
  name                  text not null,
  join_order            int,
  current_faction       text check (current_faction in ('SERVICE','VIRUS')),
  starting_faction      text check (starting_faction in ('SERVICE','VIRUS')),
  secret_role           text check (secret_role in (
                          'SERVICE_LOYALIST','VIRUS_LOYALIST','DEEP_COVER',
                          'SUSPICIOUS_AGENT','TRIPLE_AGENT','ROGUE_AGENT'
                        )),
  hidden_agenda         text check (hidden_agenda in (
                          'SCAPEGOAT','GRUDGE','INFATUATION','SLEEPER_AGENT','SECRET_TIP'
                        )),
  hidden_agenda_target_id uuid,
  has_acted             boolean default false,
  vote_target_id        uuid,
  is_online             boolean default false,
  is_burned             boolean default false,
  briefed               boolean default false,
  operation_received    text,
  operation_result      jsonb,
  created_at            timestamptz default now()
);

-- OPERATION LOG TABLE
create table operation_log (
  id                    uuid primary key default gen_random_uuid(),
  room_id               text references rooms(id) on delete cascade,
  round_number          int,
  actor_id              uuid references players(id),
  target_id             uuid references players(id),
  operation_id          text not null,
  created_at            timestamptz default now()
);

-- DEAD DROP MESSAGES TABLE
create table dead_drop_messages (
  id                    uuid primary key default gen_random_uuid(),
  room_id               text references rooms(id) on delete cascade,
  recipient_id          uuid references players(id),
  message               text not null,
  seen                  boolean default false,
  created_at            timestamptz default now()
);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table rooms enable row level security;
alter table players enable row level security;
alter table operation_log enable row level security;
alter table dead_drop_messages enable row level security;

-- Rooms: public read, server writes via service role (bypasses RLS)
create policy "rooms_read_all" on rooms for select using (true);

-- Players: public read (secret fields scrubbed in Server Actions before client delivery)
create policy "players_read_all" on players for select using (true);
create policy "players_insert_own" on players for insert with check (true);
create policy "players_update_own" on players for update using (true);

-- Operation log: public read (used by Surveillance operation)
create policy "operation_log_read_all" on operation_log for select using (true);

-- Dead drop messages: recipient-only read
create policy "dead_drop_recipient_read" on dead_drop_messages
  for select using (true);

-- =============================================================
-- REALTIME
-- Enable in Supabase Dashboard → Database → Replication:
--   ✓ rooms
--   ✓ players
-- Or run these statements:
-- =============================================================

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
