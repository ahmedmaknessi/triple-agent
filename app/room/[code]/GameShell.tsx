'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { joinRoom } from '@/actions/room.actions';
import { getOrCreateToken } from '@/lib/utils/token';
import { scrubPlayersForClient } from '@/lib/game/scrub';
import { useRoom } from '@/hooks/useRoom';
import { usePlayers } from '@/hooks/usePlayers';
import { useMyPlayer } from '@/hooks/useMyPlayer';
import { usePresence } from '@/hooks/usePresence';
import { PhaseRouter } from '@/components/game/PhaseRouter';
import type { Player } from '@/types/game';

interface GameShellProps {
  code: string;
}

export function GameShell({ code }: GameShellProps) {
  const router = useRouter();
  const [playerToken] = useState(() => getOrCreateToken());

  const { room, loading: roomLoading }       = useRoom(code);
  const { players, loading: playersLoading } = usePlayers(code);
  const { myPlayer }                         = useMyPlayer(players, room);

  usePresence(code, myPlayer?.id ?? null, playerToken, room);

  // Scrub secret fields from OTHER players during active game phases.
  // BRIEFING is excluded so getTeammateList() can see current_faction for teammate display.
  // LOBBY/FINISHED expose no sensitive data (no factions assigned yet / full reveal is correct).
  const displayPlayers = useMemo((): Player[] => {
    if (!myPlayer || !room) return players;
    if (['OPERATIONS', 'DISCUSSION', 'VOTING'].includes(room.status)) {
      return scrubPlayersForClient(myPlayer.id, players, room.status) as Player[];
    }
    return players;
  }, [players, myPlayer, room]);

  // Auto-join state (for direct URL navigation without going through landing)
  const [joinName, setJoinName]     = useState('');
  const [joinError, setJoinError]   = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  const isLoading = roomLoading || playersLoading;

  // Room not found after load → redirect home
  useEffect(() => {
    if (!isLoading && !room) {
      router.replace('/');
    }
  }, [isLoading, room, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]">
        <p className="font-mono text-sm text-[var(--color-text-muted)] [animation:decrypting_1.5s_steps(4)_infinite]">
          [DECRYPTING...]
        </p>
      </div>
    );
  }

  if (!room) return null; // redirect in progress

  // Player not in the room — show inline join form
  if (!myPlayer) {
    async function handleJoin(e: React.FormEvent) {
      e.preventDefault();
      if (!joinName.trim()) return;
      setJoinError(null);
      setJoinLoading(true);
      const result = await joinRoom(code, joinName.trim(), playerToken);
      if ('error' in result) {
        setJoinError(result.error);
        setJoinLoading(false);
      }
      // On success: players subscription picks up the new row automatically
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg-base)] px-4">
        <p className="font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
          ROOM {code}
        </p>
        <h2 className="font-syne text-2xl font-bold text-[var(--color-text-primary)]">
          JOIN MISSION
        </h2>
        <form onSubmit={handleJoin} className="flex w-full max-w-xs flex-col gap-4">
          <input
            autoFocus
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            maxLength={20}
            placeholder="Enter your name"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 font-mono text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent-green)] focus:outline-none"
          />
          {joinError && (
            <p className="font-mono text-sm text-[var(--color-accent-red)]">{joinError}</p>
          )}
          <button
            type="submit"
            disabled={!joinName.trim() || joinLoading}
            className="rounded-lg bg-[var(--color-accent-green)] py-3 font-mono text-sm font-medium tracking-widest text-[var(--color-bg-base)] disabled:opacity-40"
          >
            {joinLoading ? '[JOINING...]' : 'JOIN ROOM'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <PhaseRouter
      room={room}
      players={displayPlayers}
      myPlayer={myPlayer}
      playerToken={playerToken}
    />
  );
}
