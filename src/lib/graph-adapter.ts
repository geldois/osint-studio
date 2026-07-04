import type { Edge, Node, XYPosition } from "@xyflow/react";
import type { ApiEdge, ApiNode, NodeType } from "@/types/api";

export interface CardRow {
  key: string;
  value: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardData = {
  label: string;
  nodeType: NodeType;
  isRoot: boolean;
  cnpj: string | null;
  rows: CardRow[];
};

export type EntityNode = Node<CardData, "entity">;

export interface NodeLayout {
  position: XYPosition;
  width?: number;
  height?: number;
}

export type LayoutMap = Record<string, NodeLayout>;

export function extractLabel(node: ApiNode): string {
  switch (node.type) {
    case "company":
      return node.trade_name || node.legal_name;
    case "person":
      return node.name;
    case "address":
      return [node.cep, node.street, node.neighborhood, `${node.city}/${node.state}`]
        .filter(Boolean)
        .join(" · ");
    case "email":
      return node.address;
    case "phone":
      return node.number;
    case "cnae":
      return `${node.code} · ${node.description}`;
    case "sanction":
      return node.organ;
  }
}

export function nodeToRows(node: ApiNode): CardRow[] {
  switch (node.type) {
    case "company":
      return [
        { key: "cnpj", value: node.cnpj },
        { key: "razão social", value: node.legal_name },
        { key: "nome fantasia", value: node.trade_name },
        { key: "situação", value: node.registration_status },
        { key: "situação desde", value: node.registration_status_date },
        { key: "motivo", value: node.registration_status_reason },
        { key: "porte", value: node.size_category },
        { key: "natureza", value: node.legal_nature },
        { key: "capital", value: node.share_capital },
        { key: "início atividade", value: node.activity_start_date },
        { key: "matriz", value: node.is_headquarters ? "sim" : "não" },
      ];
    case "person":
      return [
        { key: "nome", value: node.name },
        { key: "cpf", value: node.cpf },
        { key: "faixa etária", value: node.age_range },
      ];
    case "address":
      return [
        { key: "cep", value: node.cep },
        { key: "logradouro", value: node.street },
        { key: "número", value: node.number },
        { key: "complemento", value: node.complement },
        { key: "bairro", value: node.neighborhood },
        { key: "município", value: node.city },
        { key: "uf", value: node.state },
      ];
    case "cnae":
      return [
        { key: "código", value: node.code },
        { key: "descrição", value: node.description },
      ];
    case "email":
      return [{ key: "e-mail", value: node.address }];
    case "phone":
      return [{ key: "telefone", value: node.number }];
    case "sanction":
      return [{ key: "órgão", value: node.organ }];
  }
}

export function radialPosition(
  index: number,
  count: number,
  center: XYPosition,
  radius: number,
): XYPosition {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

export function edgeKey(edge: ApiEdge): string {
  return `${edge.source_id}|${edge.target_id}|${edge.type}`;
}

export function apiEdgeToRfEdge(edge: ApiEdge): Edge {
  return {
    id: edgeKey(edge),
    source: edge.source_id,
    target: edge.target_id,
    type: "smoothstep",
    ...(edge.type === "person_owns_company" ? { label: edge.role } : {}),
  };
}

export function projectGraph(
  rawNodes: ApiNode[],
  rawEdges: ApiEdge[],
  roots: Set<string>,
  layout: LayoutMap,
): { nodes: EntityNode[]; edges: Edge[] } {
  const nodes = rawNodes.map((node): EntityNode => {
    const nodeLayout = layout[node.id];
    return {
      id: node.id,
      type: "entity",
      position: nodeLayout?.position ?? { x: 0, y: 0 },
      ...(nodeLayout?.width !== undefined ? { width: nodeLayout.width } : {}),
      ...(nodeLayout?.height !== undefined ? { height: nodeLayout.height } : {}),
      data: {
        label: extractLabel(node),
        nodeType: node.type,
        isRoot: roots.has(node.id),
        cnpj: node.type === "company" ? node.cnpj : null,
        rows: nodeToRows(node),
      },
    };
  });
  return { nodes, edges: rawEdges.map(apiEdgeToRfEdge) };
}
