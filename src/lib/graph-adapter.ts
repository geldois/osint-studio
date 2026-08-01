import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api";
import type { Edge, Node } from "@xyflow/react";
import type { ApiEdge, ApiNode, NodeType } from "@/types/api";

const DEFAULT_NODE_WIDTH = 208;
const DEFAULT_NODE_HEIGHT = 64;
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
  cpf: string | null;
  rows: CardRow[];
};

export type EntityNode = Node<CardData, "entity">;

const TEXT_PREVIEW_LENGTH = 60;

export function extractLabel(node: ApiNode): string {
  switch (node.type) {
    case "company":
      return node.trade_name ?? node.legal_name ?? node.cnpj;
    case "person":
      return node.name ?? node.cpf;
    case "address": {
      const cityState = [node.city, node.state].filter(Boolean).join("/");
      return [node.cep, node.street, node.neighborhood, cityState || null]
        .filter(Boolean)
        .join(" · ");
    }
    case "email":
      return node.address;
    case "phone":
      return node.number;
    case "cnae":
      return `${node.code} · ${node.description}`;
    case "sanction":
      return node.organ;
    case "text_source":
      return node.text.length > TEXT_PREVIEW_LENGTH
        ? `${node.text.slice(0, TEXT_PREVIEW_LENGTH)}…`
        : node.text;
  }
}

const EMPTY = "—";

export function nodeToRows(node: ApiNode): CardRow[] {
  switch (node.type) {
    case "company":
      return [
        { key: "cnpj", value: node.cnpj },
        { key: "razão social", value: node.legal_name ?? EMPTY },
        { key: "nome fantasia", value: node.trade_name ?? EMPTY },
        { key: "situação", value: node.registration_status ?? EMPTY },
        { key: "situação desde", value: node.registration_status_date ?? EMPTY },
        { key: "motivo", value: node.registration_status_reason ?? EMPTY },
        { key: "porte", value: node.size_category ?? EMPTY },
        { key: "natureza", value: node.legal_nature ?? EMPTY },
        { key: "capital", value: node.share_capital ?? EMPTY },
        { key: "início atividade", value: node.activity_start_date ?? EMPTY },
        {
          key: "matriz",
          value: node.is_headquarters === null ? EMPTY : node.is_headquarters ? "sim" : "não",
        },
      ];
    case "person":
      return [
        { key: "nome", value: node.name ?? EMPTY },
        { key: "cpf", value: node.cpf },
        { key: "faixa etária", value: node.age_range ?? EMPTY },
      ];
    case "address":
      return [
        { key: "cep", value: node.cep },
        { key: "logradouro", value: node.street ?? EMPTY },
        { key: "número", value: node.number },
        { key: "complemento", value: node.complement ?? EMPTY },
        { key: "bairro", value: node.neighborhood ?? EMPTY },
        { key: "município", value: node.city ?? EMPTY },
        { key: "uf", value: node.state ?? EMPTY },
      ];
    case "text_source":
      return [{ key: "texto", value: node.text }];
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

export interface EdgeRelationship {
  edgeId: string;
  edgeType: ApiEdge["type"];
  /** "forward" if this relationship's source_id is the RF edge's source
   * (line points source → target); "backward" if it runs the other way. */
  direction: "forward" | "backward";
}

export interface RelationshipEdgeData extends Record<string, unknown> {
  relationships: EdgeRelationship[];
}

/** React Flow draws one line per array entry, so two relationships between
 * the same pair of nodes (e.g. a person owns a company AND shares its
 * address) would render as two overlapping lines each with their own
 * marker. Grouping by unordered node pair collapses them into a single
 * line with one marker carrying every relationship for that pair, so the
 * UI shows one diamond + a stacked list instead of duplicates. */
export function groupEdgesByPair(edges: ApiEdge[]): Edge<RelationshipEdgeData>[] {
  const groups = new Map<
    string,
    { source: string; target: string; relationships: EdgeRelationship[] }
  >();
  for (const edge of edges) {
    const pairKey = [edge.source_id, edge.target_id].sort().join("|");
    let group = groups.get(pairKey);
    if (group === undefined) {
      group = { source: edge.source_id, target: edge.target_id, relationships: [] };
      groups.set(pairKey, group);
    }
    group.relationships.push({
      edgeId: edgeKey(edge),
      edgeType: edge.type,
      direction: edge.source_id === group.source ? "forward" : "backward",
    });
  }
  return [...groups.entries()].map(([pairKey, group]) => ({
    id: pairKey,
    source: group.source,
    target: group.target,
    type: "relationship",
    data: { relationships: group.relationships },
  }));
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
        cpf: node.type === "person" ? node.cpf : null,
        rows: nodeToRows(node),
      },
    }),
  );
  return { nodes, edges: groupEdgesByPair(rawEdges) };
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
  // A pairwise push-apart pass only resolves one overlapping pair per sweep in
  // the worst case (a long chain of stacked siblings, e.g. a company with 40+
  // directors) — 12 passes converged for small graphs but left large fan-outs
  // still overlapping. Scale with node count so dense components fully settle.
  const MAX_PASSES = Math.max(60, boxes.length * 4);
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
