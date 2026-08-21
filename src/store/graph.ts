import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ApiEdge, ApiNode, GraphSchema } from "@/types/api";

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

interface GraphStore {
  edgeOverrides: Record<string, ApiEdge>;
  hasHydrated: boolean;
  nodeOverrides: Record<string, ApiNode>;
  order: Record<string, string[]>;
  revisions: Record<string, GraphSchema>;
  selected: string[];

  clearOverrides: () => void;
  overrideEdge: (edgeKey: string, edge: ApiEdge | null) => void;
  overrideNode: (nodeId: string, node: ApiNode | null) => void;
  receiveGraph: (schema: GraphSchema) => void;
  receiveHistory: (rootId: string, schemas: GraphSchema[]) => void;
  reset: () => void;
  selectRevisions: (contentIds: string[]) => void;
  setHasHydrated: () => void;
}

const INITIAL_STATE = {
  edgeOverrides: {},
  nodeOverrides: {},
  order: {},
  revisions: {},
  selected: [],
};

export const useGraphStore = create<GraphStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      hasHydrated: false,
      clearOverrides: () => {
        set({ edgeOverrides: {}, nodeOverrides: {} });
      },
      overrideNode: (nodeId, node) => {
        set((state) => ({
          nodeOverrides:
            node === null
              ? withoutKey(state.nodeOverrides, nodeId)
              : { ...state.nodeOverrides, [nodeId]: node },
        }));
      },
      overrideEdge: (key, edge) => {
        set((state) => ({
          edgeOverrides:
            edge === null
              ? withoutKey(state.edgeOverrides, key)
              : { ...state.edgeOverrides, [key]: edge },
        }));
      },
      receiveGraph: (schema) => {
        set((state) => {
          const revisions = { ...state.revisions, [schema.content_id]: schema };
          const existingOrder = state.order[schema.root_id] ?? [];
          const order = existingOrder.includes(schema.content_id)
            ? state.order
            : {
                ...state.order,
                [schema.root_id]: [...existingOrder, schema.content_id],
              };
          const selected = state.selected.includes(schema.content_id)
            ? state.selected
            : [...state.selected, schema.content_id];
          return { revisions, order, selected };
        });
      },
      receiveHistory: (rootId, schemas) => {
        set((state) => {
          const revisions = { ...state.revisions };
          for (const schema of schemas) {
            revisions[schema.content_id] = schema;
          }
          const order = { ...state.order, [rootId]: schemas.map((s) => s.content_id) };
          return { revisions, order };
        });
      },
      selectRevisions: (contentIds) => {
        set({ selected: contentIds });
      },
      reset: () => {
        set(INITIAL_STATE);
      },
      setHasHydrated: () => {
        set({ hasHydrated: true });
      },
    }),
    {
      name: "osint-studio-overlay",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ selected: state.selected }),
      onRehydrateStorage: () => (state, error) => {
        if (state === undefined || error !== undefined) {
          return;
        }
        state.setHasHydrated();
      },
    },
  ),
);
