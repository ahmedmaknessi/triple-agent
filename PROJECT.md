# Triple Agent — Project Summary

> Agent-facing reference for bug testing, reporting, and fixing.

---

## What This Is

A full-stack real-time multiplayer web clone of the party game **Triple Agent**. 5–12 players each open the app on their own device and play through shared, server-authoritative game state. No login required — identity is tracked via a UUID stored in `localStorage`.

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js App Router | 14.2.x |
| UI | React | 18.x |
| Styling | Tailwind CSS v4 | ^4.3 |
| Components | shadcn/ui | 4.9.0 |
| Client state | Zustand | ^4.5 |
| Database | Supabase (PostgreSQL) | — |
| Realtime | Supabase Realtime + Presence | — |
| Supabase client | @supabase/supabase-js | ^2.106.2 |
| SSR client | @supabase/ssr | ^0.5.2 |
| Icons | lucide-react | ^0.400 |

---

## Environment Variables

```
# .env.local  (never committed)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      ← server-only, never exposed to client
```

---

## Running the App

```bash
npm run dev     # development (localhost:3000)
npm run build   # production build
npm run start   # serve production build
```

> **Important:** Server Action error messages are hidden in production builds by Next.js. Always use `npm run dev` when debugging action errors.

---

## File Structure

```
triple-agent/
├── app/
│   ├── layout.tsx                  # Root layout, Google fonts (Syne, DM Sans, DM Mono)
│   ├── page.tsx                    # Landing page: Create Room / Join Room
│   ├── globals.css                 # Tailwind v4 @theme tokens + shadcn CSS vars
│   ├── api/game/route.ts           # GET /api/game?room=CODE — polls timers
│   └── room/[code]/
│       ├── page.tsx                # Server component shell → renders GameShell
│       ├── GameShell.tsx           # Client root: hooks + PhaseRouter
│       └── loading.tsx             # Skeleton shown during navigation
│
├── actions/                        # ALL server-side logic lives here ('use server')
│   ├── room.actions.ts             # createRoom, joinRoom, kickPlayer, handleHostDisconnect, updateOnlineStatus
│   ├── game.actions.ts             # startGame, confirmBriefing, startOperations, resetRoom
│   ├── operations.actions.ts       # drawOperation, executeOperation, forceSkip
│   ├── discussion.actions.ts       # requestPause, approvePause, resumeTimer, checkDiscussionExpiry
│   └── voting.actions.ts           # submitVote, checkVotingExpiry, getGameResult
│
├── components/
│   ├── game/
│   │   ├── PhaseRouter.tsx         # Reads room.status → renders correct phase component
│   │   ├── Lobby.tsx               # Player list, Start Game, Kick controls
│   │   ├── Briefing.tsx            # Private role reveal + hold-to-confirm; Begin Operations button
│   │   ├── OperationCard.tsx       # Draw/execute operation; Force Skip (host, 90s delay)
│   │   ├── DiscussionTimer.tsx     # Live countdown, pause/resume controls
│   │   ├── VotingBallot.tsx        # Secret vote UI + 60s countdown
│   │   ├── ResultsScreen.tsx       # Full reveal table + winner banner + Play Again
│   │   └── PlayerList.tsx          # Reusable online/offline player roster
│   └── layout/
│       ├── RoomCodeDisplay.tsx     # Large monospace code + copy button
│       └── ClassifiedBanner.tsx    # "CLASSIFIED — EYES ONLY" header strip
│
├── hooks/
│   ├── useRoom.ts                  # Supabase Realtime → rooms row
│   ├── usePlayers.ts               # Supabase Realtime → players table
│   ├── useMyPlayer.ts              # Finds own player by token; handles kick redirect
│   ├── usePresence.ts              # Online status + host disconnect detection (10s timer)
│   └── useTimer.ts                 # Countdown from timer_ends_at; polls /api/game when expired
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # createBrowserClient (anon key) — client components only
│   │   └── server.ts               # createClient with service role key — server actions only
│   ├── game/
│   │   ├── operations.ts           # All 15 operations with execute() — pure functions, no DB
│   │   ├── win-conditions.ts       # resolveWinner(players) — pure function
│   │   ├── faction-assignment.ts   # assignFactionsAndRoles(playerIds)
│   │   ├── roles.ts                # getTeammateList() — Rogue Agent algorithm
│   │   ├── scrub.ts                # scrubPlayerForClient() — anti-cheat data filter
│   │   └── timer.ts                # computeRemainingMs(timerEndsAt)
│   └── utils/
│       ├── room-code.ts            # generateRoomCode() → 4-char alphanumeric
│       └── token.ts                # getOrCreateToken(), getToken(), clearToken()
│
├── store/
│   └── gameStore.ts                # Zustand: privateMessage, hasVoted (client-only UI state)
│
├── types/
│   ├── database.ts                 # Supabase row/insert/update types + Database interface
│   └── game.ts                     # Re-exports + ExecuteContext, OperationResult, WinResult, etc.
│
└── supabase/
    └── schema.sql                  # Full schema (run once in Supabase SQL editor)
```

---

## Database Schema

### `rooms`
| Column | Type | Notes |
|---|---|---|
| id | text PK | 4-char alphanumeric room code |
| host_id | uuid | FK → players.id |
| status | text | LOBBY \| BRIEFING \| OPERATIONS \| DISCUSSION \| VOTING \| FINISHED |
| paused_by | text | `null` = not paused; `"Name"` = pending; `"Name:12345"` = active pause with 12345ms remaining |
| timer_ends_at | timestamptz | Server-authoritative timer |
| kicked_players | text[] | Array of `local_storage_token` values |
| current_turn_player_id | uuid | Active player for BRIEFING / OPERATIONS |
| round_number | int | For wire_tap multi-round support |

### `players`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Auto-generated |
| room_id | text | FK → rooms.id |
| local_storage_token | text UNIQUE | Browser identity |
| name | text | Display name |
| join_order | int | Determines turn order |
| current_faction | text | SERVICE \| VIRUS |
| starting_faction | text | Original faction (before mutations) |
| secret_role | text | SERVICE_LOYALIST \| VIRUS_LOYALIST \| DEEP_COVER \| SUSPICIOUS_AGENT \| TRIPLE_AGENT \| ROGUE_AGENT |
| hidden_agenda | text | SCAPEGOAT \| GRUDGE \| INFATUATION \| SLEEPER_AGENT \| SECRET_TIP |
| hidden_agenda_target_id | uuid | For GRUDGE and INFATUATION |
| has_acted | boolean | Completed their operations turn |
| vote_target_id | uuid | Who they voted to imprison |
| is_online | boolean | Synced via Presence |
| is_burned | boolean | From Burn Notice operation |
| briefed | boolean | Confirmed their briefing screen |
| operation_received | text | Operation ID drawn this round |
| operation_result | jsonb | Private result (server-only) |

### `operation_log`
Logs every executed operation. Used by the `surveillance` operation.

### `dead_drop_messages`
Private messages delivered to recipient on their next turn start.

---

## Game Flow (Phase Sequence)

```
LOBBY → BRIEFING → OPERATIONS → DISCUSSION → VOTING → FINISHED
```

### LOBBY
- Host creates room → gets 4-char code
- Other players join via code
- Minimum 5 players required to start
- Host can kick players
- Host clicks **Start Game** → calls `startGame()`

### BRIEFING
- Players are briefed one at a time in `join_order`
- `current_turn_player_id` advances after each `confirmBriefing()` call
- When all briefed, `current_turn_player_id` becomes `null`
- Host sees **Begin Operations** button → calls `startOperations()`

### OPERATIONS
- Players take turns in `join_order`
- Active player calls `drawOperation()` then `executeOperation()`
- Other players see waiting screen
- Host can Force Skip after 90 seconds of inactivity
- When all players have `has_acted = true`, auto-transitions to DISCUSSION

### DISCUSSION
- 2-minute server timer (`timer_ends_at`)
- Any player can request pause; host approves/resumes
- Pause state encoded in `paused_by`: `"Name:remainingMs"` when active
- `/api/game?room=CODE` polled by clients to detect timer expiry

### VOTING
- 60-second server timer
- Each player submits one vote (no self-vote, no changing vote)
- Auto-tallies when all votes in, or when timer expires
- Votes hidden from others until resolved

### FINISHED
- `resolveWinner(players)` computes outcome from vote data
- Full reveal: faction, role, agenda, outcome per player
- Host can **Play Again** → `resetRoom()`

---

## Security Architecture

### Anti-cheat boundary
- `lib/supabase/server.ts` (service role key) is **only ever imported in `actions/`**
- `lib/supabase/client.ts` (anon key) is used in hooks/components
- Every player returned to the client must pass through `scrubPlayerForClient()`:
  - Nulls `current_faction`, `starting_faction`, `secret_role`, `hidden_agenda`, `hidden_agenda_target_id`, `operation_received`, `operation_result`, `vote_target_id` for other players
  - Returns full data for own player or when `status === 'FINISHED'`

### Operation execution
- All `execute()` calls happen inside Server Actions — never in client components
- `execute()` functions are pure (no DB calls) — take `ExecuteContext`, return `OperationResult`
- Server Action applies `playerMutations` and `deadDrop` after execute

---

## Server Action Error Pattern

`createRoom` and `joinRoom` return **discriminated unions** (not throw) so error messages survive production builds:

```typescript
// Returns { code, playerId } on success OR { error: string } on failure
const result = await createRoom(name, token);
if ('error' in result) { setError(result.error); return; }
router.push(`/room/${result.code}`);
```

Other server actions (game, operations, voting) still throw — errors are caught by `useTransition` error state in the calling component.

---

## Key Invariants

1. **`local_storage_token` is globally unique** — one player identity across all rooms at a time
2. **`kicked_players` stores tokens, not IDs** — checked against raw token in `useMyPlayer`
3. **`paused_by` is dual-purpose**: `"Name"` = pending request; `"Name:12345"` = active pause with ms remaining
4. **`timer_ends_at` is server-authoritative** — clients derive countdown from it; never trusted client-side time
5. **Operations deck**: 12 base (5 INFO + 4 MUTATE + 3 hidden_agenda) + 3 expansion (added for 8+ players)
6. **Force Skip** button only appears after 90 seconds on the host's waiting screen
7. **Tie vote → VIRUS wins** immediately without checking imprisoned player identity

---

## Known Bugs Fixed

| Bug | Fix |
|---|---|
| `local_storage_token` unique constraint on repeat create | `createRoom` checks/deletes stale player before inserting |
| `useRef(createClient())` ran `createBrowserClient` during SSR | Changed to lazy init inside `getSupabase()` called only inside `useEffect` |
| `kicked_players` check used `myPlayer.id` instead of token | Fixed to check raw token; works even when player deleted from DB |
| Briefing waiting screen showed `"..."` after last player confirmed | Detected `current_turn_player_id === null` as "all briefed" state |
| No way to start operations after briefing | Added **Begin Operations** button (host only) that calls `startOperations()` |
| Server Action errors show generic Next.js message in prod | `createRoom`/`joinRoom` now return `{ error }` objects instead of throwing |
| Force Skip button always visible | Hidden for first 90s per turn via `useEffect` timeout |

---

## Operations Reference

### Base (always available)
| ID | Category | Target | Effect |
|---|---|---|---|
| `anonymous_tip` | INFO | 1 | Apparent faction (respects Deep Cover/Suspicious/burned) |
| `old_photographs` | INFO | 1 | Starting faction of target + 1 random player |
| `background_check` | INFO | 1 | True faction (bypasses all modifiers) |
| `wire_tap` | INFO | 1 | Did target vote for active player last round? |
| `psychological_profile` | INFO | 1 | Does target have a secret role? (yes/no) |
| `defector` | MUTATE | 1 | Flip target faction; fails on Loyalists |
| `deep_undercover` | MUTATE | 1 | Service→VIRUS; reveals role if Deep Cover/Suspicious |
| `covert_exchange` | MUTATE | 2 | Swap two players' factions; fails if either is Loyalist |
| `burn_notice` | MUTATE | 1 | Permanently marks player as burned (true faction exposed) |
| `hidden_agenda` | AGENDA | varies | Sub-type assigned at draw: SCAPEGOAT, GRUDGE, INFATUATION, SLEEPER_AGENT, SECRET_TIP |

### Expansion (8+ players only)
| ID | Category | Effect |
|---|---|---|
| `surveillance` | INFO | Lists all operations that targeted a chosen player |
| `dead_drop` | INFO | Sends private message to target; delivered on their next turn |
| `loyalty_test` | INFO | Which of two players has never switched faction? |

### Win Condition Overrides
1. **SCAPEGOAT**: imprisoned player wins alone; everyone else loses
2. **GRUDGE**: holder loses if their target is not imprisoned
3. **INFATUATION**: holder wins if their chosen target wins
4. **TRIPLE AGENT** (secret role): VIRUS wins only if the Triple Agent is imprisoned; otherwise Service wins even if another VIRUS is imprisoned
5. **Tie vote**: VIRUS wins immediately

---

## Realtime Channels

| Channel | Table | Event | Used by |
|---|---|---|---|
| `room:{code}` | rooms | `*` | `useRoom` |
| `players:{code}` | players | `INSERT/UPDATE/DELETE` | `usePlayers` |
| `presence:{code}` | — | presence sync | `usePresence` (host disconnect detection) |
