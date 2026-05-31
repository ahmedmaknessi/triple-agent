'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, clearToken } from '@/lib/utils/token';
import type { Player, Room } from '@/types/game';

export function useMyPlayer(players: Player[], room: Room | null) {
  const router = useRouter();
  const token = getToken();

  const myPlayer = useMemo(
    () => players.find((p) => p.local_storage_token === token) ?? null,
    [players, token],
  );

  const kickedRef = useRef(false);

  // §9.E — kicked_players stores local_storage_token values.
  // Check the raw token even when myPlayer is null (player was already deleted from DB).
  useEffect(() => {
    if (!room || !token || kickedRef.current) return;

    const isKicked = (room.kicked_players ?? []).includes(token);
    if (isKicked) {
      kickedRef.current = true;
      clearToken();
      window.alert('You were removed from this session by the host.');
      router.replace('/');
    }
  }, [token, room, router]);

  return { myPlayer, token };
}
