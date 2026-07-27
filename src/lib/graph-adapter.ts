import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api";
import type { Edge, Node } from "@xyflow/react";
import type { ApiEdge, ApiNode, NodeType } from "@/types/api";

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 120;
const COMPONENT_MARGIN = 160;

const elk = new ELK();

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

function findConnectedComponents(nodeIds: string[], edges: Edge[]): string[][] {
  const parent = new Map<string, string>(nodeIds.map((id) => [id, id]));

  const find = (id: string): string => {
    let root = id;
    for (;;) {
      const next = parent.get(root);
      if (next === undefined || next === root) {
        break;
      }
      root = next;
    }
    parent.set(id, root);
    return root;
  };

  for (const edge of edges) {
    if (parent.has(edge.source) && parent.has(edge.target)) {
      const rootA = find(edge.source);
      const rootB = find(edge.target);
      if (rootA !== rootB) {
        parent.set(rootA, rootB);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const id of nodeIds) {
    const root = find(id);
    const group = groups.get(root);
    if (group === undefined) {
      groups.set(root, [id]);
    } else {
      group.push(id);
    }
  }
  return [...groups.values()];
}

// ELK's radial algorithm requires a strict tree (one parent per node) or it
// throws "The given graph is not a tree!" — this domain graph can have
// multi-parent nodes (e.g. an address shared by a company and its owner), so
// a BFS spanning tree from the component's anchor is used for the radial
// layout math only. The full edge list is still what gets rendered.
function buildSpanningTreeEdges(
  rootId: string,
  componentIds: string[],
  edges: Edge[],
): Edge[] {
  const idSet = new Set(componentIds);
  const adjacency = new Map<string, Edge[]>();
  const addAdjacency = (id: string, edge: Edge): void => {
    const existing = adjacency.get(id);
    if (existing === undefined) {
      adjacency.set(id, [edge]);
    } else {
      existing.push(edge);
    }
  };
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) {
      continue;
    }
    addAdjacency(edge.source, edge);
    addAdjacency(edge.target, edge);
  }

  const visited = new Set([rootId]);
  const treeEdges: Edge[] = [];
  const queue = [rootId];
  for (const current of queue) {
    for (const edge of adjacency.get(current) ?? []) {
      const neighbor = edge.source === current ? edge.target : edge.source;
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      treeEdges.push(edge);
      queue.push(neighbor);
    }
  }
  return treeEdges;
}

interface PositionedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ELK's radial radius calculation doesn't fully account for very uneven node
// sizes (large company/sanction cards next to a one-line email card), which
// can leave residual overlap. This is a small, bounded local repair pass —
// push apart along the axis of least penetration — run after the algorithm,
// not a replacement for it.
function separateOverlaps(boxes: PositionedBox[]): void {
  const PADDING = 24;
  const MAX_PASSES = 12;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let moved = false;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a === undefined || b === undefined) {
          continue;
        }
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        const penetrationX = overlapX + PADDING;
        const penetrationY = overlapY + PADDING;
        if (penetrationX <= 0 || penetrationY <= 0) {
          continue;
        }
        moved = true;
        if (penetrationX < penetrationY) {
          const push = penetrationX / 2;
          if (a.x + a.width / 2 < b.x + b.width / 2) {
            a.x -= push;
            b.x += push;
          } else {
            a.x += push;
            b.x -= push;
          }
        } else {
          const push = penetrationY / 2;
          if (a.y + a.height / 2 < b.y + b.height / 2) {
            a.y -= push;
            b.y += push;
          } else {
            a.y += push;
            b.y -= push;
          }
        }
      }
    }
    if (!moved) {
      break;
    }
  }
}

// Each connected component (one per anchor search) is laid out independently
// with ELK's radial algorithm, then packed left to right — ELK's radial
// layouter expects a single connected graph per run, so mixing unrelated
// searches into one call would produce an undefined arrangement.
export async function layoutGraph(
  nodes: EntityNode[],
  edges: Edge[],
): Promise<EntityNode[]> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const components = findConnectedComponents(
    nodes.map((node) => node.id),
    edges,
  );

  const laidOut: EntityNode[] = [];
  let offsetX = 0;

  for (const componentIds of components) {
    const componentNodes = componentIds
      .map((id) => byId.get(id))
      .filter((node): node is EntityNode => node !== undefined);
    const anchor =
      componentNodes.find((node) => node.data.isRoot) ?? componentNodes[0];
    const treeEdges =
      anchor === undefined
        ? []
        : buildSpanningTreeEdges(anchor.id, componentIds, edges);

    const elkGraph: ElkNode = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "radial",
        "elk.spacing.nodeNode": "80",
      },
      children: componentNodes.map((node) => ({
        id: node.id,
        width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
        height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
      })),
      edges: treeEdges.map(
        (edge): ElkExtendedEdge => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        }),
      ),
    };

    let children: ElkNode[];
    try {
      const result = await elk.layout(elkGraph);
      children = result.children ?? [];
    } catch (error) {
      console.error("radial layout failed, falling back to a simple grid", error);
      children = componentNodes.map((node, index) => ({
        id: node.id,
        x: (index % 4) * (DEFAULT_NODE_WIDTH + 40),
        y: Math.floor(index / 4) * (DEFAULT_NODE_HEIGHT + 40),
        width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
        height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
      }));
    }

    const boxes: PositionedBox[] = children.map((child) => ({
      x: child.x ?? 0,
      y: child.y ?? 0,
      width: child.width ?? DEFAULT_NODE_WIDTH,
      height: child.height ?? DEFAULT_NODE_HEIGHT,
    }));
    separateOverlaps(boxes);
    children = children.map((child, index) => ({
      ...child,
      x: boxes[index]?.x ?? child.x ?? 0,
      y: boxes[index]?.y ?? child.y ?? 0,
    }));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const child of children) {
      const x = child.x ?? 0;
      const y = child.y ?? 0;
      const width = child.width ?? DEFAULT_NODE_WIDTH;
      const height = child.height ?? DEFAULT_NODE_HEIGHT;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + height);
    }

    for (const child of children) {
      const node = byId.get(child.id);
      if (node === undefined) {
        continue;
      }
      laidOut.push({
        ...node,
        position: {
          x: offsetX + (child.x ?? 0) - minX,
          y: (child.y ?? 0) - minY - (maxY - minY) / 2,
        },
      });
    }

    offsetX += maxX - minX + COMPONENT_MARGIN;
  }

  return laidOut;
}
