'use client';

import { useEffect, useRef, useState } from 'react';
import { computeRemainingMs } from '@/lib/game/timer';

const TICK_MS    = 500;
const POLL_MS    = 3_000;

export function useTimer(
  timerEndsAt: string | null,
  roomCode: string,
  active: boolean,
) {
  const [remainingMs, setRemainingMs] = useState(() => computeRemainingMs(timerEndsAt));
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recompute when timerEndsAt changes
  useEffect(() => {
    setRemainingMs(computeRemainingMs(timerEndsAt));
  }, [timerEndsAt]);

  // Countdown tick
  useEffect(() => {
    if (!active || !timerEndsAt) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    tickRef.current = setInterval(() => {
      setRemainingMs(computeRemainingMs(timerEndsAt));
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [active, timerEndsAt]);

  // Poll /api/game when timer has expired so the server advances the phase
  useEffect(() => {
    if (!active || !roomCode || !timerEndsAt) return;

    const expired = computeRemainingMs(timerEndsAt) <= 0;
    if (!expired) return;

    function poll() {
      fetch(`/api/game?room=${roomCode}`).catch(() => {});
      pollRef.current = setTimeout(poll, POLL_MS);
    }

    poll();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [active, roomCode, timerEndsAt, remainingMs]);

  return remainingMs;
}
