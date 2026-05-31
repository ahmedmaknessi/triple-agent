import { cn } from '@/lib/utils';
import type { Player } from '@/types/game';

interface PlayerListProps {
  players: Player[];
  myPlayerId?: string;
  hostId?: string | null;
  activePlayerId?: string | null;
  showOnlineStatus?: boolean;
  renderAction?: (player: Player) => React.ReactNode;
  className?: string;
}

export function PlayerList({
  players,
  myPlayerId,
  hostId,
  activePlayerId,
  showOnlineStatus = true,
  renderAction,
  className,
}: PlayerListProps) {
  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {players.map((player) => {
        const isMe      = player.id === myPlayerId;
        const isHost    = player.id === hostId;
        const isActive  = player.id === activePlayerId;

        return (
          <li
            key={player.id}
            className={cn(
              'glass flex items-center justify-between rounded-lg px-4 py-3',
              isActive && 'ring-1 ring-[var(--color-accent-green)]',
            )}
          >
            <div className="flex items-center gap-3">
              {showOnlineStatus && (
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    player.is_online
                      ? 'bg-[var(--color-accent-green)]'
                      : 'bg-[var(--color-text-muted)]',
                  )}
                />
              )}
              <span className="font-medium text-[var(--color-text-primary)]">
                {player.name}
              </span>
              <div className="flex gap-1.5">
                {isMe && (
                  <span className="rounded bg-[var(--color-bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                    YOU
                  </span>
                )}
                {isHost && (
                  <span className="rounded bg-[var(--color-bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-accent-amber)]">
                    HOST
                  </span>
                )}
                {player.is_burned && (
                  <span className="rounded bg-[var(--color-accent-red)]/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-accent-red)]">
                    BURNED
                  </span>
                )}
              </div>
            </div>
            {renderAction?.(player)}
          </li>
        );
      })}
    </ul>
  );
}
