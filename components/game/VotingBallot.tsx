'use client';

import { useState, useTransition } from 'react';
import { Lock } from 'lucide-react';
import { submitVote } from '@/actions/voting.actions';
import { useTimer } from '@/hooks/useTimer';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import type { Room, Player } from '@/types/game';

const VOTING_DURATION_MS = 60 * 1000;

interface VotingBallotProps {
  room: Room;
  players: Player[];
  myPlayer: Player;
  playerToken: string;
}

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export function VotingBallot({ room, players, myPlayer, playerToken }: VotingBallotProps) {
  const hasVoted    = useGameStore((s) => s.hasVoted) || !!myPlayer.vote_target_id;
  const setHasVoted = useGameStore((s) => s.setHasVoted);

  const remainingMs = useTimer(room.timer_ends_at, room.id, true);
  const progressPct = Math.min(100, (remainingMs / VOTING_DURATION_MS) * 100);

  const [selected, setSelected]   = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validTargets = players.filter((p) => p.id !== myPlayer.id);

  function handleSubmit() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        await submitVote(room.id, playerToken, selected);
        setHasVoted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Vote failed');
      }
    });
  }

  if (hasVoted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg-base)] px-4">
        <p className="font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
          VOTE CAST
        </p>
        <Lock size={32} className="text-[var(--color-accent-green)]" />
        <p className="font-mono text-sm text-[var(--color-text-secondary)]">
          AWAITING OTHER AGENTS...
        </p>

        {/* Who has/hasn't voted */}
        <ul className="mt-4 flex flex-col gap-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 font-mono text-sm">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  p.vote_target_id
                    ? 'bg-[var(--color-accent-green)]'
                    : 'bg-[var(--color-text-muted)]',
                )}
              />
              <span
                className={
                  p.vote_target_id
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)]'
                }
              >
                {p.name}
              </span>
              {p.vote_target_id ? (
                <span className="text-[var(--color-text-muted)]">VOTED</span>
              ) : (
                <span className="text-[var(--color-text-muted)]">PENDING</span>
              )}
            </li>
          ))}
        </ul>

        {/* Timer */}
        <div className="mt-4 font-mono text-2xl tabular-nums text-[var(--color-accent-amber)]">
          {formatTime(remainingMs)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-[var(--color-bg-base)] px-4 py-10">
      {/* Header + timer */}
      <div className="flex w-full max-w-md items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
          VOTE TO IMPRISON
        </p>
        <p
          className={cn(
            'font-mono text-xl tabular-nums',
            remainingMs < 15_000
              ? 'text-[var(--color-accent-red)]'
              : 'text-[var(--color-accent-amber)]',
          )}
        >
          {formatTime(remainingMs)}
        </p>
      </div>

      {/* Timer bar */}
      <div className="h-1 w-full max-w-md rounded-full bg-[var(--color-bg-elevated)]">
        <div
          className="h-1 rounded-full bg-[var(--color-accent-amber)] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Agent list */}
      <ul className="flex w-full max-w-md flex-col gap-2">
        {validTargets.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => setSelected(p.id)}
              className={cn(
                'w-full rounded-lg border px-4 py-4 text-left font-mono text-sm transition-all',
                selected === p.id
                  ? 'border-[var(--color-accent-red)] bg-[var(--color-accent-red)]/10 text-[var(--color-text-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    p.is_online
                      ? 'bg-[var(--color-accent-green)]'
                      : 'bg-[var(--color-text-muted)]',
                  )}
                />
                {p.name}
                {p.is_burned && (
                  <span className="ml-auto font-mono text-[10px] text-[var(--color-accent-red)]">
                    BURNED
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p className="font-mono text-sm text-[var(--color-accent-red)]">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected || isPending}
        className="w-full max-w-md rounded-lg bg-[var(--color-accent-red)] py-3 font-mono text-sm font-medium tracking-widest text-white disabled:opacity-40"
      >
        SUBMIT VOTE
      </button>
    </div>
  );
}
