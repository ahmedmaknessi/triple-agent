'use client';

import { useEffect } from 'react';
import { Lobby }           from '@/components/game/Lobby';
import { Briefing }        from '@/components/game/Briefing';
import { OperationCard }   from '@/components/game/OperationCard';
import { DiscussionTimer } from '@/components/game/DiscussionTimer';
import { VotingBallot }    from '@/components/game/VotingBallot';
import { ResultsScreen }   from '@/components/game/ResultsScreen';
import { useGameStore }    from '@/store/gameStore';
import type { Room, Player } from '@/types/game';

interface PhaseRouterProps {
  room: Room;
  players: Player[];
  myPlayer: Player;
  playerToken: string;
}

export function PhaseRouter({ room, players, myPlayer, playerToken }: PhaseRouterProps) {
  const { privateMessage, clearPrivateMessage, resetRound } = useGameStore();

  // Clear local per-round state on phase transitions
  useEffect(() => {
    resetRound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.status]);

  const props = { room, players, myPlayer, playerToken, hostToken: playerToken };

  return (
    <>
      {/* Private message overlay */}
      {privateMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={clearPrivateMessage}
        >
          <div
            className="glass max-w-sm rounded-xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
              CLASSIFIED RESULT
            </p>
            <p className="font-mono text-sm text-[var(--color-text-primary)]">{privateMessage}</p>
            <button
              onClick={clearPrivateMessage}
              className="mt-4 font-mono text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              [DISMISS]
            </button>
          </div>
        </div>
      )}

      {room.status === 'LOBBY' && (
        <Lobby room={room} players={players} myPlayer={myPlayer} hostToken={playerToken} />
      )}

      {room.status === 'BRIEFING' && (
        <Briefing room={room} players={players} myPlayer={myPlayer} playerToken={playerToken} />
      )}

      {room.status === 'OPERATIONS' && (
        <OperationCard
          room={room}
          players={players}
          myPlayer={myPlayer}
          playerToken={playerToken}
          hostToken={playerToken}
        />
      )}

      {room.status === 'DISCUSSION' && (
        <DiscussionTimer
          room={room}
          myPlayer={myPlayer}
          playerToken={playerToken}
          hostToken={playerToken}
        />
      )}

      {room.status === 'VOTING' && (
        <VotingBallot
          room={room}
          players={players}
          myPlayer={myPlayer}
          playerToken={playerToken}
        />
      )}

      {room.status === 'FINISHED' && (
        <ResultsScreen
          room={room}
          players={players}
          myPlayer={myPlayer}
          hostToken={playerToken}
        />
      )}
    </>
  );
}
