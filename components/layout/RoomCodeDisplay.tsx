'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomCodeDisplayProps {
  code: string;
  className?: string;
}

export function RoomCodeDisplay({ code, className }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="font-mono text-4xl font-medium tracking-[0.3em] text-[var(--color-text-primary)]">
        {code}
      </span>
      <button
        onClick={handleCopy}
        className="rounded p-1.5 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent-green)]"
        aria-label="Copy room code"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}
