import { create } from "zustand";

interface HoverStore {
  hoveredNodeId: string | null;
  hoveredEdgeGroupId: string | null;
  setHoveredNode: (id: string | null) => void;
  setHoveredEdgeGroup: (id: string | null) => void;
}

export const useHoverStore = create<HoverStore>((set) => ({
  hoveredNodeId: null,
  hoveredEdgeGroupId: null,
  setHoveredNode: (id) => {
    set({ hoveredNodeId: id });
  },
  setHoveredEdgeGroup: (id) => {
    set({ hoveredEdgeGroupId: id });
  },
}));
