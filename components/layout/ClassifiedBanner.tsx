import { cn } from '@/lib/utils';

interface ClassifiedBannerProps {
  className?: string;
}

export function ClassifiedBanner({ className }: ClassifiedBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 border-b border-[var(--color-border)] py-2',
        className,
      )}
    >
      <span className="font-mono text-xs tracking-[0.25em] text-[var(--color-text-muted)]">
        ▬▬▬
      </span>
      <span className="font-mono text-xs font-medium tracking-[0.35em] text-[var(--color-accent-red)]">
        CLASSIFIED — EYES ONLY
      </span>
      <span className="font-mono text-xs tracking-[0.25em] text-[var(--color-text-muted)]">
        ▬▬▬
      </span>
    </div>
  );
}
