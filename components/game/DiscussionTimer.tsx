'use client';

import { useState, useTransition } from 'react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { requestPause, approvePause, resumeTimer } from '@/actions/discussion.actions';
import { useTimer } from '@/hooks/useTimer';
import { cn } from '@/lib/utils';
import type { Room, Player } from '@/types/game';

const DISCUSSION_DURATION_MS = 2 * 60 * 1000;

interface DiscussionTimerProps {
  room: Room;
  myPlayer: Player;
  playerToken: string;
  hostToken: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function DiscussionTimer({ room, myPlayer, playerToken, hostToken }: DiscussionTimerProps) {
  const isHost = myPlayer.id === room.host_id;

  const isPaused     = !!room.paused_by;
  const pausedByName = room.paused_by?.split(':')[0] ?? null;
  const pendingApproval = isPaused && !room.paused_by?.includes(':');

  const remainingMs = useTimer(room.timer_ends_at, room.id, !isPaused);
  const progressPct = Math.min(100, (remainingMs / DISCUSSION_DURATION_MS) * 100);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestPause() {
    setError(null);
    startTransition(async () => {
      try {
        await requestPause(room.id, playerToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to request pause');
      }
    });
  }

  function handleApprovePause() {
    startTransition(async () => {
      try {
        await approvePause(room.id, hostToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to approve pause');
      }
    });
  }

  function handleResume() {
    startTransition(async () => {
      try {
        await resumeTimer(room.id, hostToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to resume timer');
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--color-bg-base)] px-4">
      <p className="font-mono text-xs tracking-[0.3em] text-[var(--color-text-muted)]">
        DISCUSSION PHASE
      </p>

      {/* Timer display */}
      <div
        className={cn(
          'font-mono text-7xl font-medium tabular-nums',
          remainingMs < 30_000 && !isPaused
            ? 'text-[var(--color-accent-red)]'
            : 'text-[var(--color-text-primary)]',
        )}
      >
        {isPaused ? formatTime(remainingMs) : formatTime(remainingMs)}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full max-w-sm rounded-full bg-[var(--color-bg-elevated)]">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all duration-500',
            remainingMs < 30_000 && !isPaused
              ? 'bg-[var(--color-accent-red)]'
              : 'bg-[var(--color-accent-amber)]',
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Pause status */}
      {isPaused && (
        <div className="glass rounded-lg px-6 py-3 text-center">
          {pendingApproval ? (
            <>
              <p className="font-mono text-sm text-[var(--color-accent-amber)]">
                PAUSE REQUESTED BY {pausedByName?.toUpperCase()}
              </p>
              {isHost && (
                <button
                  onClick={handleApprovePause}
                  disabled={isPending}
                  className="mt-3 flex items-center gap-2 rounded bg-[var(--color-accent-amber)]/10 px-4 py-2 font-mono text-xs text-[var(--color-accent-amber)] transition-colors hover:bg-[var(--color-accent-amber)]/20 disabled:opacity-40"
                >
                  <PauseCircle size={14} />
                  APPROVE PAUSE
                </button>
              )}
            </>
          ) : (
            <>
              <p className="font-mono text-sm text-[var(--color-accent-amber)]">
                PAUSED BY {pausedByName?.toUpperCase()}
              </p>
              {isHost && (
                <button
                  onClick={handleResume}
                  disabled={isPending}
                  className="mt-3 flex items-center gap-2 rounded bg-[var(--color-accent-green)]/10 px-4 py-2 font-mono text-xs text-[var(--color-accent-green)] transition-colors hover:bg-[var(--color-accent-green)]/20 disabled:opacity-40"
                >
                  <PlayCircle size={14} />
                  RESUME TIMER
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Request pause button (any player, only when not already paused) */}
      {!isPaused && (
        <button
          onClick={handleRequestPause}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 font-mono text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-amber)] hover:text-[var(--color-accent-amber)] disabled:opacity-40"
        >
          <PauseCircle size={14} />
          REQUEST PAUSE
        </button>
      )}

      {error && (
        <p className="font-mono text-sm text-[var(--color-accent-red)]">{error}</p>
      )}
    </div>
  );
}
