'use client';

import { useState, useRef, useTransition } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { confirmBriefing } from '@/actions/game.actions';
import { getTeammateList } from '@/lib/game/roles';
import { ClassifiedBanner } from '@/components/layout/ClassifiedBanner';
import type { Room, Player } from '@/types/game';

interface BriefingProps {
  room: Room;
  players: Player[];
  myPlayer: Player;
  playerToken: string;
}

const HOLD_DURATION_MS = 2000;

export function Briefing({ room, players, myPlayer, playerToken }: BriefingProps) {
  const isMyTurn = room.current_turn_player_id === myPlayer.id;
  const activeName = players.find((p) => p.id === room.current_turn_player_id)?.name ?? '...';

  if (!isMyTurn) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
        <ClassifiedBanner />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="font-mono text-sm tracking-[0.2em] text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-primary)]">{activeName}</span> IS BEING
            BRIEFED — EYES FORWARD
          </p>
          <span className="font-mono text-xs text-[var(--color-text-muted)] [animation:decrypting_1.5s_steps(4)_infinite]">
            [DECRYPTING...]
          </span>
        </div>
      </div>
    );
  }

  return <BriefingCard myPlayer={myPlayer} players={players} playerToken={playerToken} roomId={room.id} />;
}

function BriefingCard({
  myPlayer,
  players,
  playerToken,
  roomId,
}: {
  myPlayer: Player;
  players: Player[];
  playerToken: string;
  roomId: string;
}) {
  const { teammates } = getTeammateList(myPlayer, players);
  const faction = myPlayer.current_faction;
  const isVirus = faction === 'VIRUS';

  const [holdProgress, setHoldProgress] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  function startHold() {
    if (confirmed || isPending) return;
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
      const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(intervalRef.current!);
        setConfirmed(true);
        startTransition(async () => {
          await confirmBriefing(roomId, playerToken);
        });
      }
    }, 50);
  }

  function cancelHold() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHoldProgress(0);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <ClassifiedBanner />

      <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--color-text-muted)]">
          CLASSIFIED BRIEFING — {myPlayer.name.toUpperCase()}
        </p>

        {/* Faction badge */}
        <div
          className={`flex items-center gap-2 rounded-lg border px-6 py-4 ${
            isVirus
              ? 'border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/5'
              : 'border-[var(--color-accent-green)]/30 bg-[var(--color-accent-green)]/5'
          }`}
        >
          {isVirus ? (
            <AlertTriangle size={20} className="text-[var(--color-accent-red)]" />
          ) : (
            <Shield size={20} className="text-[var(--color-accent-green)]" />
          )}
          <span
            className={`font-syne text-2xl font-bold tracking-wider ${
              isVirus ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-green)]'
            }`}
          >
            {isVirus ? 'V.I.R.U.S.' : 'THE SERVICE'}
          </span>
        </div>

        {/* Secret role */}
        {myPlayer.secret_role && (
          <div className="glass w-full max-w-sm rounded-lg p-4 text-center">
            <p className="font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
              SECRET ROLE
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-[var(--color-accent-amber)]">
              {myPlayer.secret_role.replace(/_/g, ' ')}
            </p>
          </div>
        )}

        {/* Teammates (VIRUS only) */}
        {isVirus && (
          <div className="glass w-full max-w-sm rounded-lg p-4">
            <p className="mb-3 font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
              KNOWN V.I.R.U.S. AGENTS
            </p>
            {teammates.length === 0 ? (
              <p className="font-mono text-xs text-[var(--color-text-muted)]">
                There are no other active V.I.R.U.S. agents for you to see.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {teammates.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 font-mono text-sm text-[var(--color-text-primary)]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-red)]" />
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Hold-to-confirm */}
        <div className="mt-auto w-full max-w-sm">
          {confirmed ? (
            <p className="text-center font-mono text-sm text-[var(--color-text-secondary)]">
              [BRIEFING CONFIRMED]
            </p>
          ) : (
            <>
              <div className="mb-2 h-1 w-full rounded-full bg-[var(--color-bg-elevated)]">
                <div
                  className="h-1 rounded-full bg-[var(--color-accent-green)] transition-all"
                  style={{ width: `${holdProgress}%` }}
                />
              </div>
              <button
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                disabled={isPending}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-4 font-mono text-sm tracking-widest text-[var(--color-text-secondary)] select-none transition-colors active:bg-[var(--color-bg-elevated)]"
              >
                HOLD TO CONFIRM
              </button>
              <p className="mt-2 text-center font-mono text-[10px] text-[var(--color-text-muted)]">
                Hold for 2 seconds to acknowledge your briefing
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
