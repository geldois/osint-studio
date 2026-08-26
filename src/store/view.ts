import { create } from "zustand";

export type WhiteboardView = "graph" | "table" | "findings";

interface ViewStore {
  view: WhiteboardView;
  setView: (view: WhiteboardView) => void;
}

export const useViewStore = create<ViewStore>((set) => ({
  view: "graph",
  setView: (view) => {
    set({ view });
  },
}));
