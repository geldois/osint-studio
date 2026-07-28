import type { ApiEdge, ApiNode, EdgeType } from "@/types/api";
import { extractLabel } from "@/lib/graph-adapter";

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  company_has_cnae: "possui CNAE",
  company_has_email: "possui e-mail",
  company_has_member: "possui membro",
  company_has_phone: "possui telefone",
  company_located_at: "localizada em",
  company_received_sanction: "recebeu sanção",
  person_has_email: "possui e-mail",
  person_has_phone: "possui telefone",
  person_owns_company: "sócio de",
  person_received_sanction: "recebeu sanção",
  person_reside_at: "reside em",
};

export function edgeTypeLabel(type: EdgeType): string {
  return EDGE_TYPE_LABELS[type];
}

export interface EdgeAttribute {
  key: string;
  value: string;
}

export function edgeAttributes(edge: ApiEdge): EdgeAttribute[] {
  if (edge.type !== "person_owns_company") {
    return [];
  }
  return [
    { key: "papel", value: edge.role },
    { key: "desde", value: edge.entry_date },
  ];
}

export interface NodeRelationship {
  edge: ApiEdge;
  direction: "outgoing" | "incoming";
  counterpart: ApiNode;
}

export function relationshipsForNode(
  nodeId: string,
  edges: ApiEdge[],
  nodeById: Map<string, ApiNode>,
): NodeRelationship[] {
  const relationships: NodeRelationship[] = [];
  for (const edge of edges) {
    if (edge.source_id === nodeId) {
      const counterpart = nodeById.get(edge.target_id);
      if (counterpart !== undefined) {
        relationships.push({ edge, direction: "outgoing", counterpart });
      }
    } else if (edge.target_id === nodeId) {
      const counterpart = nodeById.get(edge.source_id);
      if (counterpart !== undefined) {
        relationships.push({ edge, direction: "incoming", counterpart });
      }
    }
  }
  return relationships;
}

export function counterpartLabel(node: ApiNode): string {
  return extractLabel(node);
}
