import { create } from "zustand";
import { edgeKey, type LayoutMap, radialPosition } from "@/lib/graph-adapter";
import type { ApiEdge, ApiNode, GraphSchema } from "@/types/api";

const RING_RADIUS = 320;
const CARD_WIDTH = 260;

interface GraphStore {
  rawNodes: ApiNode[];
  rawEdges: ApiEdge[];
  roots: Set<string>;
  layout: LayoutMap;
  mergeGraph: (schema: GraphSchema, anchorId: string | null) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  rawNodes: [],
  rawEdges: [],
  roots: new Set(),
  layout: {},
  mergeGraph: (schema, anchorId) => {
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

      const layout: LayoutMap = { ...state.layout };
      const anchor = (anchorId !== null ? layout[anchorId]?.position : undefined) ?? {
        x: 0,
        y: 0,
      };
      const fresh = rawNodes.filter((node) => layout[node.id] === undefined);
      fresh.forEach((node, index) => {
        layout[node.id] = {
          position: radialPosition(index, fresh.length, anchor, RING_RADIUS),
          width: CARD_WIDTH,
        };
      });

      return { rawNodes, rawEdges, roots, layout };
    });
  },
  reset: () => {
    set({ rawNodes: [], rawEdges: [], roots: new Set(), layout: {} });
  },
}));
