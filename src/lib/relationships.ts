import type { ApiEdge, ApiNode, EdgeType, NodeType } from "@/types/api";
import { extractLabel } from "@/lib/graph-adapter";

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  address: "Endereço",
  cnae: "CNAE",
  company: "Empresa",
  email: "E-mail",
  legal_process: "Processo jurídico",
  person: "Pessoa",
  phone: "Telefone",
  political_exposure: "Exposição política",
  sanction: "Sanção",
  text_source: "Texto",
};

export function nodeTypeLabel(type: NodeType): string {
  return NODE_TYPE_LABELS[type];
}

const NODE_TYPE_ACCENT_BORDER: Record<NodeType, string> = {
  address: "border-amber-500",
  cnae: "border-sky-400",
  company: "border-emerald-500",
  email: "border-violet-500",
  legal_process: "border-rose-500",
  person: "border-blue-500",
  phone: "border-orange-500",
  political_exposure: "border-indigo-500",
  sanction: "border-red-500",
  text_source: "border-slate-400",
};

export function nodeTypeAccentBorder(type: NodeType): string {
  return NODE_TYPE_ACCENT_BORDER[type];
}

const NODE_TYPE_PLURAL_LABELS: Record<NodeType, string> = {
  address: "Endereços",
  cnae: "CNAEs",
  company: "Empresas",
  email: "E-mails",
  legal_process: "Processos jurídicos",
  person: "Pessoas",
  phone: "Telefones",
  political_exposure: "Exposições políticas",
  sanction: "Sanções",
  text_source: "Textos",
};

export function nodeTypePluralLabel(type: NodeType): string {
  return NODE_TYPE_PLURAL_LABELS[type];
}

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  address_mentioned_in_text: "mencionado em texto",
  company_has_cnae: "possui CNAE",
  company_has_email: "possui e-mail",
  company_has_member: "possui membro",
  company_has_phone: "possui telefone",
  company_is_party_in_legal_process: "é parte em processo",
  company_located_at: "localizada em",
  company_mentioned_in_text: "mencionado em texto",
  company_owns_company: "sócia de",
  company_received_sanction: "recebeu sanção",
  person_has_email: "possui e-mail",
  person_has_phone: "possui telefone",
  person_has_political_exposure: "possui exposição política",
  person_is_party_in_legal_process: "é parte em processo",
  person_mentioned_in_text: "mencionado em texto",
  person_owns_company: "sócio de",
  person_received_sanction: "recebeu sanção",
  person_reside_at: "reside em",
  possibly_matches: "possivelmente a mesma entidade",
};

export function edgeTypeLabel(type: EdgeType): string {
  return EDGE_TYPE_LABELS[type];
}

export interface EdgeAttribute {
  key: string;
  value: string;
}

export function edgeAttributes(edge: ApiEdge): EdgeAttribute[] {
  if (edge.type === "company_owns_company" || edge.type === "person_owns_company") {
    return [
      { key: "papel", value: edge.role },
      { key: "desde", value: edge.entry_date },
    ];
  }
  if (
    edge.type === "address_mentioned_in_text" ||
    edge.type === "company_mentioned_in_text" ||
    edge.type === "person_mentioned_in_text"
  ) {
    return [
      { key: "campo extraído", value: edge.matched_field },
      { key: "padrão", value: edge.pattern_name },
    ];
  }
  if (edge.type === "possibly_matches") {
    return [
      { key: "confiança", value: `${(Number(edge.confidence) * 100).toFixed(0)}%` },
    ];
  }
  return [];
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
  return relationships.sort((a, b) => {
    const byEdgeType = edgeTypeLabel(a.edge.type).localeCompare(
      edgeTypeLabel(b.edge.type),
      "pt-BR",
    );
    if (byEdgeType !== 0) {
      return byEdgeType;
    }
    return counterpartLabel(a.counterpart).localeCompare(
      counterpartLabel(b.counterpart),
      "pt-BR",
    );
  });
}

export function counterpartLabel(node: ApiNode): string {
  return extractLabel(node);
}
