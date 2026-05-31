export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-base)]">
      <p className="font-mono text-xs tracking-[0.4em] text-[var(--color-text-muted)]">
        CLASSIFIED OPERATION
      </p>
      <p className="font-mono text-sm text-[var(--color-text-muted)] [animation:decrypting_1.5s_steps(4)_infinite]">
        [DECRYPTING...]
      </p>
    </div>
  );
}
