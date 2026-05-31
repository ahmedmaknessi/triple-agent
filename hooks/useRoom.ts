'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Room } from '@/types/game';

export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;

    const supabase = createClient();

    async function fetchRoom() {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomCode)
        .single();
      setRoom(data ? (data as Room) : null);
      setLoading(false);
    }

    fetchRoom();

    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setRoom(null);
          } else {
            setRoom(payload.new as Room);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return { room, loading };
}
