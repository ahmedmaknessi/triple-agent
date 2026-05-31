'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Player } from '@/types/game';

export function usePlayers(roomCode: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;

    const supabase = createClient();

    async function fetchPlayers() {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomCode)
        .order('join_order', { ascending: true });
      setPlayers((data as Player[]) ?? []);
      setLoading(false);
    }

    fetchPlayers();

    const channel = supabase
      .channel(`players:${roomCode}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` },
        (payload) => {
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === (payload.new as Player).id);
            if (exists) return prev;
            return [...prev, payload.new as Player].sort(
              (a, b) => (a.join_order ?? 0) - (b.join_order ?? 0),
            );
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` },
        (payload) => {
          setPlayers((prev) =>
            prev.map((p) => (p.id === (payload.new as Player).id ? (payload.new as Player) : p)),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` },
        (payload) => {
          setPlayers((prev) => prev.filter((p) => p.id !== (payload.old as Player).id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return { players, loading };
}
