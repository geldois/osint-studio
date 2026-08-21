import { create } from "zustand";

interface ConflictFilterStore {
  active: boolean;
  toggle: () => void;
  reset: () => void;
}

export const useConflictFilterStore = create<ConflictFilterStore>((set) => ({
  active: false,
  toggle: () => {
    set((state) => ({ active: !state.active }));
  },
  reset: () => {
    set({ active: false });
  },
}));
