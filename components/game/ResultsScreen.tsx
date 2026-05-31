'use client';

import { useTransition } from 'react';
import { Trophy, Skull } from 'lucide-react';
import { resetRoom } from '@/actions/game.actions';
import { resolveWinner } from '@/lib/game/win-conditions';
import { ClassifiedBanner } from '@/components/layout/ClassifiedBanner';
import { cn } from '@/lib/utils';
import type { Room, Player } from '@/types/game';

interface ResultsScreenProps {
  room: Room;
  players: Player[];
  myPlayer: Player;
  hostToken: string;
}

const REASON_LABELS: Record<string, string> = {
  IMPRISONED_VIRUS:       'A V.I.R.U.S. agent was imprisoned.',
  IMPRISONED_SERVICE:     'A Service agent was imprisoned.',
  TIE_VOTE:               'The vote was tied — V.I.R.U.S. wins by default.',
  SCAPEGOAT:              'The imprisoned agent wanted to be caught.',
  TRIPLE_AGENT_IMPRISONED:'The Triple Agent was imprisoned.',
  TRIPLE_AGENT_SURVIVED:  'The Triple Agent survived — V.I.R.U.S. wins.',
};

export function ResultsScreen({ room, players, myPlayer, hostToken }: ResultsScreenProps) {
  const isHost = myPlayer.id === room.host_id;
  const [isPending, startTransition] = useTransition();

  const result   = resolveWinner(players);
  const isService = result.winner === 'SERVICE';
  const isVirus   = result.winner === 'VIRUS';

  const imprisoned = players.find((p) => p.id === result.imprisonedPlayerId);

  function handlePlayAgain() {
    startTransition(async () => {
      await resetRoom(room.id, hostToken);
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <ClassifiedBanner />

      <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
        {/* Winner banner */}
        <div
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border px-10 py-6',
            isService
              ? 'border-[var(--color-accent-green)]/40 bg-[var(--color-accent-green)]/5'
              : isVirus
              ? 'border-[var(--color-accent-red)]/40 bg-[var(--color-accent-red)]/5'
              : 'border-[var(--color-accent-amber)]/40 bg-[var(--color-accent-amber)]/5',
          )}
        >
          {isService ? (
            <Trophy size={32} className="text-[var(--color-accent-green)]" />
          ) : (
            <Skull size={32} className={isVirus ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-amber)]'} />
          )}
          <h1
            className={cn(
              'font-syne text-3xl font-bold tracking-wider',
              isService
                ? 'text-[var(--color-accent-green)]'
                : isVirus
                ? 'text-[var(--color-accent-red)]'
                : 'text-[var(--color-accent-amber)]',
            )}
          >
            {isService ? 'THE SERVICE WINS' : isVirus ? 'V.I.R.U.S. WINS' : 'INDIVIDUAL WIN'}
          </h1>
          <p className="font-mono text-sm text-[var(--color-text-secondary)]">
            {REASON_LABELS[result.reason] ?? result.reason}
          </p>
        </div>

        {/* Full reveal table */}
        <div className="w-full max-w-2xl overflow-x-auto">
          <table className="w-full border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] tracking-widest text-[var(--color-text-muted)]">
                <th className="pb-2 pr-4">AGENT</th>
                <th className="pb-2 pr-4">START</th>
                <th className="pb-2 pr-4">FINAL</th>
                <th className="pb-2 pr-4">ROLE</th>
                <th className="pb-2 pr-4">AGENDA</th>
                <th className="pb-2">OUTCOME</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const isImprisoned = p.id === result.imprisonedPlayerId;
                const outcome      = result.playerOutcomes[p.id];

                return (
                  <tr
                    key={p.id}
                    className={cn(
                      'border-b border-[var(--color-border)]/50',
                      isImprisoned && 'ring-1 ring-inset ring-[var(--color-accent-red)]/50',
                    )}
                  >
                    <td className="py-3 pr-4 text-[var(--color-text-primary)]">
                      {p.name}
                      {isImprisoned && (
                        <span className="ml-2 text-[10px] text-[var(--color-accent-red)]">
                          IMPRISONED
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <FactionBadge faction={p.starting_faction} />
                    </td>
                    <td className="py-3 pr-4">
                      <FactionBadge faction={p.current_faction} />
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                      {p.secret_role?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                      {p.hidden_agenda?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td
                      className={cn(
                        'py-3 font-medium',
                        outcome === 'WIN'
                          ? 'text-[var(--color-accent-green)]'
                          : 'text-[var(--color-accent-red)]',
                      )}
                    >
                      {outcome ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isHost && (
          <button
            onClick={handlePlayAgain}
            disabled={isPending}
            className="rounded-lg border border-[var(--color-border)] px-8 py-3 font-mono text-sm tracking-widest text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-green)] hover:text-[var(--color-accent-green)] disabled:opacity-40"
          >
            PLAY AGAIN
          </button>
        )}
      </div>
    </div>
  );
}

function FactionBadge({ faction }: { faction: string | null }) {
  if (!faction) return <span className="text-[var(--color-text-muted)]">—</span>;
  const isVirus = faction === 'VIRUS';
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px]',
        isVirus
          ? 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]'
          : 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]',
      )}
    >
      {isVirus ? 'VIRUS' : 'SERVICE'}
    </span>
  );
}
