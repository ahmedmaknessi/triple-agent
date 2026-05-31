export function computeRemainingMs(timerEndsAt: string | null): number {
  if (!timerEndsAt) return 0;
  return Math.max(0, new Date(timerEndsAt).getTime() - Date.now());
}
