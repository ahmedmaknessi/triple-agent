'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateOnlineStatus, handleHostDisconnect } from '@/actions/room.actions';
import type { Room } from '@/types/game';

const HOST_TIMEOUT_MS = 10_000;

export function usePresence(
  roomCode: string,
  playerId: string | null,
  playerToken: string | null,
  room: Room | null,
) {
  const hostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef  = useRef(createClient());

  // Mark self online/offline via server action
  useEffect(() => {
    if (!roomCode || !playerToken) return;

    updateOnlineStatus(roomCode, playerToken, true).catch(() => {});

    return () => {
      updateOnlineStatus(roomCode, playerToken, false).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, playerToken]);

  // Supabase Presence for host disconnect detection
  useEffect(() => {
    if (!roomCode || !room?.host_id) return;

    const supabase = supabaseRef.current;
    const channel = supabase.channel(`presence:${roomCode}`, {
      config: { presence: { key: playerId ?? 'anon' } },
    });

    channel
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const hostLeft = leftPresences.some(
          (p: Record<string, unknown>) => p['player_id'] === room.host_id,
        );
        if (!hostLeft) return;

        // Give host 10 s to reconnect before triggering reassignment
        if (hostTimerRef.current) clearTimeout(hostTimerRef.current);
        hostTimerRef.current = setTimeout(() => {
          handleHostDisconnect(roomCode, room.host_id!).catch(() => {});
        }, HOST_TIMEOUT_MS);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const hostRejoined = newPresences.some(
          (p: Record<string, unknown>) => p['player_id'] === room.host_id,
        );
        if (hostRejoined && hostTimerRef.current) {
          clearTimeout(hostTimerRef.current);
          hostTimerRef.current = null;
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && playerId) {
          await channel.track({ player_id: playerId });
        }
      });

    return () => {
      if (hostTimerRef.current) clearTimeout(hostTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [roomCode, room?.host_id, playerId]);
}
