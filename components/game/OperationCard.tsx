'use client';

import { useState, useEffect, useTransition } from 'react';
import { Zap } from 'lucide-react';
import { drawOperation, executeOperation } from '@/actions/operations.actions';
import { forceSkip } from '@/actions/operations.actions';
import { OPERATIONS } from '@/lib/game/operations';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import type { Room, Player } from '@/types/game';

interface OperationCardProps {
  room: Room;
  players: Player[];
  myPlayer: Player;
  playerToken: string;
  hostToken: string;
}

export function OperationCard({ room, players, myPlayer, playerToken, hostToken }: OperationCardProps) {
  const isMyTurn = room.current_turn_player_id === myPlayer.id;
  const isHost   = myPlayer.id === room.host_id;
  const activeName = players.find((p) => p.id === room.current_turn_player_id)?.name ?? '...';
  const activePlayer = players.find((p) => p.id === room.current_turn_player_id);

  const setPrivateMessage = useGameStore((s) => s.setPrivateMessage);

  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // §9.F — show Force Skip only after 90 s of inactivity; reset on each turn change
  const [showForceSkip, setShowForceSkip] = useState(false);
  useEffect(() => {
    if (isMyTurn || !isHost || !room.current_turn_player_id) {
      setShowForceSkip(false);
      return;
    }
    setShowForceSkip(false);
    const timer = setTimeout(() => setShowForceSkip(true), 90_000);
    return () => clearTimeout(timer);
  }, [room.current_turn_player_id, isMyTurn, isHost]);

  const operationId = myPlayer.operation_received;
  const operation   = operationId ? OPERATIONS[operationId] : null;

  const validTargets = players.filter((p) => p.id !== myPlayer.id);

  function handleDraw() {
    setError(null);
    startTransition(async () => {
      try {
        await drawOperation(room.id, playerToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Draw failed');
      }
    });
  }

  function handleExecute() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await executeOperation(
          room.id,
          playerToken,
          target1 || undefined,
          target2 || undefined,
        );
        if (result?.privateMessage) setPrivateMessage(result.privateMessage);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Execute failed');
      }
    });
  }

  function handleForceSkip() {
    startTransition(async () => {
      try {
        await forceSkip(room.id, hostToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Force skip failed');
      }
    });
  }

  if (!isMyTurn) {
    const activeOp = activePlayer?.operation_received
      ? OPERATIONS[activePlayer.operation_received]?.name
      : null;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg-base)] px-4">
        <p className="font-mono text-xs tracking-[0.2em] text-[var(--color-text-muted)]">
          OPERATION IN PROGRESS
        </p>
        <p className="text-center font-mono text-sm text-[var(--color-text-secondary)]">
          <span className="text-[var(--color-text-primary)]">{activeName}</span>
          {activeOp ? (
            <>
              {' '}IS EXECUTING:{' '}
              <span className="text-[var(--color-accent-amber)]">{activeOp.toUpperCase()}</span>
            </>
          ) : (
            ' IS RECEIVING THEIR OPERATION'
          )}
        </p>
        <span className="font-mono text-xs text-[var(--color-text-muted)] [animation:decrypting_1.5s_steps(4)_infinite]">
          [DECRYPTING...]
        </span>

        {showForceSkip && (
          <button
            onClick={handleForceSkip}
            disabled={isPending}
            className="mt-8 rounded border border-[var(--color-accent-red)]/40 px-4 py-2 font-mono text-xs text-[var(--color-accent-red)] transition-colors hover:bg-[var(--color-accent-red)]/10 disabled:opacity-40"
          >
            FORCE SKIP (HOST)
          </button>
        )}
      </div>
    );
  }

  // Active player view
  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-[var(--color-bg-base)] px-4 py-10">
      <p className="font-mono text-xs tracking-[0.3em] text-[var(--color-text-muted)]">
        YOUR OPERATION
      </p>

      {!operation ? (
        <div className="flex flex-col items-center gap-4">
          <p className="font-mono text-sm text-[var(--color-text-secondary)]">
            Draw your operation to begin your turn.
          </p>
          <button
            onClick={handleDraw}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-green)] px-8 py-3 font-mono text-sm font-medium tracking-widest text-[var(--color-bg-base)] disabled:opacity-40"
          >
            <Zap size={16} />
            DRAW OPERATION
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="glass rounded-xl p-6">
            <p className="font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
              {operation.category}
            </p>
            <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--color-text-primary)]">
              {operation.name.toUpperCase()}
            </h2>
            <p className="mt-3 font-mono text-sm italic text-[var(--color-text-secondary)]">
              "{operation.publicText}"
            </p>

            {/* Target selectors */}
            {operation.requiresTarget && (
              <div className="mt-4">
                <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
                  SELECT TARGET
                </label>
                <select
                  value={target1}
                  onChange={(e) => setTarget1(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-green)]"
                >
                  <option value="">— select agent —</option>
                  {validTargets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {operation.requiresSecondTarget && (
              <div className="mt-3">
                <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
                  SELECT SECOND TARGET
                </label>
                <select
                  value={target2}
                  onChange={(e) => setTarget2(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-green)]"
                >
                  <option value="">— select agent —</option>
                  {validTargets
                    .filter((p) => p.id !== target1)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 font-mono text-sm text-[var(--color-accent-red)]">{error}</p>
          )}

          <button
            onClick={handleExecute}
            disabled={
              isPending ||
              (operation.requiresTarget && !target1) ||
              (!!operation.requiresSecondTarget && !target2)
            }
            className="mt-4 w-full rounded-lg bg-[var(--color-accent-green)] py-3 font-mono text-sm font-medium tracking-widest text-[var(--color-bg-base)] disabled:opacity-40"
          >
            EXECUTE OPERATION
          </button>
        </div>
      )}

      {error && !operation && (
        <p className="font-mono text-sm text-[var(--color-accent-red)]">{error}</p>
      )}
    </div>
  );
}
