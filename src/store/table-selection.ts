import { create } from "zustand";

interface TableSelectionStore {
  selectedIds: Set<string>;
  clear: () => void;
  setMany: (ids: string[], selected: boolean) => void;
  toggle: (id: string) => void;
}

export const useTableSelectionStore = create<TableSelectionStore>((set) => ({
  selectedIds: new Set(),
  clear: () => {
    set({ selectedIds: new Set() });
  },
  setMany: (ids, selected) => {
    set((state) => {
      const selectedIds = new Set(state.selectedIds);
      for (const id of ids) {
        if (selected) {
          selectedIds.add(id);
        } else {
          selectedIds.delete(id);
        }
      }
      return { selectedIds };
    });
  },
  toggle: (id) => {
    set((state) => {
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
      } else {
        selectedIds.add(id);
      }
      return { selectedIds };
    });
  },
}));
