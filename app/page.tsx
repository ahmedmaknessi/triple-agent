'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, LogIn } from 'lucide-react';
import { createRoom, joinRoom } from '@/actions/room.actions';
import { getOrCreateToken } from '@/lib/utils/token';

type Mode = 'idle' | 'create' | 'join';

export default function LandingPage() {
  const router  = useRouter();
  const [mode, setMode]   = useState<Mode>('idle');
  const [name, setName]   = useState('');
  const [code, setCode]   = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ensure token exists in localStorage before any action
  useEffect(() => { getOrCreateToken(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    const token = getOrCreateToken();
    const result = await createRoom(name.trim(), token);
    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/room/${result.code}`);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setError(null);
    setLoading(true);
    const token = getOrCreateToken();
    const result = await joinRoom(code.trim().toUpperCase(), name.trim(), token);
    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/room/${result.code}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-base)] px-4">
      {/* Header */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <p className="font-mono text-xs tracking-[0.4em] text-[var(--color-text-muted)]">
          CLASSIFIED OPERATION
        </p>
        <h1 className="font-syne text-5xl font-bold tracking-[0.15em] text-[var(--color-text-primary)] sm:text-6xl">
          TRIPLE AGENT
        </h1>
        <p className="font-mono text-sm text-[var(--color-text-secondary)]">
          A social deduction game. 5–12 players. One truth.
        </p>
      </div>

      {/* Action area */}
      {mode === 'idle' && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-green)] px-8 py-3 font-mono text-sm font-medium tracking-widest text-[var(--color-bg-base)] transition-opacity hover:opacity-90"
          >
            <PlusCircle size={16} />
            CREATE ROOM
          </button>
          <button
            onClick={() => setMode('join')}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-8 py-3 font-mono text-sm tracking-widest text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-text-secondary)]"
          >
            <LogIn size={16} />
            JOIN ROOM
          </button>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="flex w-full max-w-sm flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
              AGENT NAME
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 font-mono text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent-green)] focus:outline-none"
            />
          </div>
          {error && <p className="font-mono text-sm text-[var(--color-accent-red)]">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setMode('idle'); setError(null); }}
              className="flex-1 rounded-lg border border-[var(--color-border)] py-3 font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              BACK
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 rounded-lg bg-[var(--color-accent-green)] py-3 font-mono text-sm font-medium tracking-widest text-[var(--color-bg-base)] disabled:opacity-40"
            >
              {loading ? '[CREATING...]' : 'CREATE'}
            </button>
          </div>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="flex w-full max-w-sm flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
              ROOM CODE
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
              placeholder="ABCD"
              maxLength={4}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 font-mono text-2xl tracking-[0.4em] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent-green)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-[var(--color-text-muted)]">
              AGENT NAME
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 font-mono text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent-green)] focus:outline-none"
            />
          </div>
          {error && <p className="font-mono text-sm text-[var(--color-accent-red)]">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setMode('idle'); setError(null); }}
              className="flex-1 rounded-lg border border-[var(--color-border)] py-3 font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              BACK
            </button>
            <button
              type="submit"
              disabled={code.length !== 4 || !name.trim() || loading}
              className="flex-1 rounded-lg bg-[var(--color-accent-green)] py-3 font-mono text-sm font-medium tracking-widest text-[var(--color-bg-base)] disabled:opacity-40"
            >
              {loading ? '[JOINING...]' : 'JOIN'}
            </button>
          </div>
        </form>
      )}

      {/* Footer */}
      <p className="absolute bottom-6 font-mono text-xs text-[var(--color-text-muted)]">
        No account required. Share the room code with other agents.
      </p>
    </div>
  );
}
