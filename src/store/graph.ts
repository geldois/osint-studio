import { create } from "zustand";
import { edgeKey } from "@/lib/graph-adapter";
import type { ApiEdge, ApiNode, GraphSchema } from "@/types/api";

interface GraphStore {
  rawNodes: ApiNode[];
  rawEdges: ApiEdge[];
  roots: Set<string>;
  mergeGraph: (schema: GraphSchema) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  rawNodes: [],
  rawEdges: [],
  roots: new Set(),
  mergeGraph: (schema) => {
    set((state) => {
      const nodeById = new Map(state.rawNodes.map((node) => [node.id, node]));
      for (const node of schema.nodes) {
        nodeById.set(node.id, node);
      }
      const rawNodes = [...nodeById.values()];

      const edgeById = new Map(state.rawEdges.map((edge) => [edgeKey(edge), edge]));
      for (const edge of schema.edges) {
        edgeById.set(edgeKey(edge), edge);
      }
      const rawEdges = [...edgeById.values()];

      const roots = new Set(state.roots).add(schema.root_id);

      return { rawNodes, rawEdges, roots };
    });
  },
  reset: () => {
    set({ rawNodes: [], rawEdges: [], roots: new Set() });
  },
}));
