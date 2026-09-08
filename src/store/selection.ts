import { create } from "zustand";

interface SelectionCollection {
  title: string;
  nodeIds: string[];
}

interface SelectionStore {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedCollection: SelectionCollection | null;
  selectNode: (id: string) => void;
  selectEdge: (id: string) => void;
  selectCollection: (title: string, nodeIds: string[]) => void;
  clearCollection: () => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedCollection: null,
  selectNode: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null, selectedCollection: null });
  },
  selectEdge: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null, selectedCollection: null });
  },
  selectCollection: (title, nodeIds) => {
    set({
      selectedCollection: { title, nodeIds },
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },
  clearCollection: () => {
    set({ selectedCollection: null });
  },
  clearSelection: () => {
    set({ selectedNodeId: null, selectedEdgeId: null, selectedCollection: null });
  },
}));
