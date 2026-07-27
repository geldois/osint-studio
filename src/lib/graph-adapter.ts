import Dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { ApiEdge, ApiNode, NodeType } from "@/types/api";

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 120;
const NODE_RANK_SEPARATION = 96;
const NODE_SEPARATION = 64;

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
      return [
        { key: "órgão", value: node.organ },
        { key: "tipo", value: node.sanction_type },
        { key: "órgão sancionador", value: node.sanctioning_body },
        { key: "fundamentação legal", value: node.legal_basis.join(", ") || "—" },
        { key: "início", value: node.start_date ?? "—" },
        { key: "fim", value: node.end_date ?? "—" },
        { key: "publicação", value: node.publication_date ?? "—" },
        { key: "processo", value: node.process_number ?? "—" },
        { key: "valor da multa", value: node.fine_amount ?? "—" },
        { key: "publicação (link)", value: node.publication_link },
      ];
  }
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
): { nodes: EntityNode[]; edges: Edge[] } {
  const nodes = rawNodes.map(
    (node): EntityNode => ({
      id: node.id,
      type: "entity",
      position: { x: 0, y: 0 },
      data: {
        label: extractLabel(node),
        nodeType: node.type,
        isRoot: roots.has(node.id),
        cnpj: node.type === "company" ? node.cnpj : null,
        rows: nodeToRows(node),
      },
    }),
  );
  return { nodes, edges: rawEdges.map(apiEdgeToRfEdge) };
}

type DagreGraph = Parameters<typeof Dagre.layout>[0];

export function layoutGraph(nodes: EntityNode[], edges: Edge[]): EntityNode[] {
  // @dagrejs/dagre's own .d.ts leaves graphlib.Graph()'s constructor generics
  // unresolved against layout()'s parameter type; tsc verifies this assignment
  // is sound, the lint rule just can't see it through the upstream stub.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const graph: DagreGraph = new Dagre.graphlib.Graph().setDefaultEdgeLabel(
    () => ({}),
  );
  graph.setGraph({
    rankdir: "TB",
    ranksep: NODE_RANK_SEPARATION,
    nodesep: NODE_SEPARATION,
  });

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
      height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
    });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  Dagre.layout(graph);

  return nodes.map((node) => {
    const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
    const { x, y } = graph.node(node.id) as { x: number; y: number };
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
  });
}
