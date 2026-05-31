'use client';

import { create } from 'zustand';

interface GameStore {
  // Private message from last operation
  privateMessage: string | null;
  setPrivateMessage: (msg: string | null) => void;

  // Whether this player has submitted a vote this round
  hasVoted: boolean;
  setHasVoted: (v: boolean) => void;

  // Dismiss the private message overlay
  clearPrivateMessage: () => void;

  // Reset per-round state (called when transitioning phases)
  resetRound: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  privateMessage: null,
  hasVoted: false,

  setPrivateMessage: (msg) => set({ privateMessage: msg }),
  setHasVoted: (v) => set({ hasVoted: v }),
  clearPrivateMessage: () => set({ privateMessage: null }),
  resetRound: () => set({ privateMessage: null, hasVoted: false }),
}));
