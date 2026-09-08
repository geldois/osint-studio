import { create } from "zustand";
import type { FindingCategory, FindingSeverity } from "@/lib/findings";

interface FindingsFilterStore {
  reset: () => void;
  selectedCategories: FindingCategory[];
  selectedSeverities: FindingSeverity[];
  setCategories: (categories: FindingCategory[]) => void;
  setSeverities: (severities: FindingSeverity[]) => void;
}

export const useFindingsFilterStore = create<FindingsFilterStore>((set) => ({
  reset: () => {
    set({ selectedCategories: [], selectedSeverities: [] });
  },
  selectedCategories: [],
  selectedSeverities: [],
  setCategories: (categories) => {
    set({ selectedCategories: categories });
  },
  setSeverities: (severities) => {
    set({ selectedSeverities: severities });
  },
}));
