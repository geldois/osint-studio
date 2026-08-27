import { extractLabel } from "@/lib/graph-adapter";
import type { OverlayResult } from "@/lib/overlay";
import { nodeTypeLabel } from "@/lib/relationships";
import type { ApiNode } from "@/types/api";

export interface EntityDegree {
  degree: number;
  label: string;
  node: ApiNode;
  typeLabel: string;
}

const EXCLUDED_FROM_CENTRALITY = new Set<ApiNode["type"]>(["text_source"]);

export function topConnectedEntities(
  overlay: OverlayResult,
  limit: number,
): EntityDegree[] {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const degreeById = new Map<string, number>();
  for (const edge of overlay.edges) {
    degreeById.set(edge.source_id, (degreeById.get(edge.source_id) ?? 0) + 1);
    degreeById.set(edge.target_id, (degreeById.get(edge.target_id) ?? 0) + 1);
  }

  return [...degreeById.entries()]
    .map(([nodeId, degree]) => {
      const node = nodeById.get(nodeId);
      return node === undefined || EXCLUDED_FROM_CENTRALITY.has(node.type)
        ? null
        : {
            degree,
            label: extractLabel(node),
            node,
            typeLabel: nodeTypeLabel(node.type),
          };
    })
    .filter((entry): entry is EntityDegree => entry !== null)
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, limit);
}
