'use client';

import { useState, useTransition } from 'react';
import { Users, Play, UserMinus } from 'lucide-react';
import { startGame } from '@/actions/game.actions';
import { kickPlayer } from '@/actions/room.actions';
import { RoomCodeDisplay } from '@/components/layout/RoomCodeDisplay';
import { ClassifiedBanner } from '@/components/layout/ClassifiedBanner';
import { PlayerList } from '@/components/game/PlayerList';
import type { Room, Player } from '@/types/game';

interface LobbyProps {
  room: Room;
  players: Player[];
  myPlayer: Player;
  hostToken: string;
}

export function Lobby({ room, players, myPlayer, hostToken }: LobbyProps) {
  const isHost = myPlayer.id === room.host_id;
  const canStart = players.length >= 5;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    setError(null);
    startTransition(async () => {
      try {
        await startGame(room.id, hostToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start game');
      }
    });
  }

  function handleKick(targetId: string) {
    startTransition(async () => {
      try {
        await kickPlayer(room.id, hostToken, targetId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to kick player');
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <ClassifiedBanner />

      <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
        <div className="flex flex-col items-center gap-2">
          <p className="font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
            ROOM CODE
          </p>
          <RoomCodeDisplay code={room.id} />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-3 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Users size={15} />
            <span className="font-mono text-xs tracking-widest">
              AGENTS ({players.length})
            </span>
          </div>

          <PlayerList
            players={players}
            myPlayerId={myPlayer.id}
            hostId={room.host_id}
            showOnlineStatus
            renderAction={
              isHost
                ? (player) =>
                    player.id !== myPlayer.id ? (
                      <button
                        onClick={() => handleKick(player.id)}
                        disabled={isPending}
                        className="rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-red)]"
                        aria-label={`Kick ${player.name}`}
                      >
                        <UserMinus size={15} />
                      </button>
                    ) : null
                : undefined
            }
          />
        </div>

        {error && (
          <p className="font-mono text-sm text-[var(--color-accent-red)]">{error}</p>
        )}

        {isHost ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleStart}
              disabled={!canStart || isPending}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-green)] px-8 py-3 font-mono text-sm font-medium tracking-widest text-[var(--color-bg-base)] transition-opacity disabled:opacity-40"
            >
              <Play size={16} />
              START GAME
            </button>
            {!canStart && (
              <p className="font-mono text-xs text-[var(--color-text-muted)]">
                Minimum 5 agents required ({5 - players.length} more needed)
              </p>
            )}
          </div>
        ) : (
          <p className="font-mono text-sm tracking-widest text-[var(--color-text-secondary)]">
            WAITING FOR HOST TO START...
          </p>
        )}
      </div>
    </div>
  );
}
