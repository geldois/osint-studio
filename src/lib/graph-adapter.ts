import type { Edge, Node } from "@xyflow/react";
import type { ApiEdge, ApiNode, NodeType } from "@/types/api";

const DEFAULT_NODE_WIDTH = 208;
const DEFAULT_NODE_HEIGHT = 64;
const COMPONENT_MARGIN = 160;

const RING_BASE_RADIUS = 180;
const RING_GAP = 150;
const RING_NODE_ARC = 248;

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
  conflictCount: number;
  isOverridden: boolean;
};

export type EntityNode = Node<CardData, "entity">;

const TEXT_PREVIEW_LENGTH = 60;

function emptyToNull(value: string | null): string | null {
  return value === "" ? null : value;
}

export function extractLabel(node: ApiNode): string {
  switch (node.type) {
    case "company":
      return emptyToNull(node.legal_name) ?? emptyToNull(node.trade_name) ?? node.cnpj;
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
        { key: "nome fantasia", value: emptyToNull(node.trade_name) ?? EMPTY },
        { key: "situação", value: node.registration_status ?? EMPTY },
        { key: "situação desde", value: node.registration_status_date ?? EMPTY },
        { key: "motivo", value: node.registration_status_reason ?? EMPTY },
        { key: "porte", value: node.size_category ?? EMPTY },
        { key: "natureza", value: node.legal_nature ?? EMPTY },
        { key: "capital", value: node.share_capital ?? EMPTY },
        { key: "início atividade", value: node.activity_start_date ?? EMPTY },
        {
          key: "matriz",
          value:
            node.is_headquarters === null
              ? EMPTY
              : node.is_headquarters
                ? "sim"
                : "não",
        },
      ];
    case "person":
      return [
        { key: "nome", value: node.name ?? EMPTY },
        { key: "cpf", value: node.cpf },
        { key: "faixa etária", value: node.age_range ?? EMPTY },
        { key: "data de nascimento", value: node.birthdate ?? EMPTY },
        { key: "situação cadastral", value: node.registration_status ?? EMPTY },
        { key: "data de cadastro", value: node.registration_date ?? EMPTY },
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
  direction: "forward" | "backward";
}

export interface RelationshipEdgeData extends Record<string, unknown> {
  relationships: EdgeRelationship[];
}

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
  nodeConflicts: Record<string, ApiNode[]>,
  overriddenNodeIds: Set<string>,
): { nodes: EntityNode[]; edges: Edge[] } {
  const nodes = rawNodes.map((node): EntityNode => ({
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
      conflictCount: nodeConflicts[node.id]?.length ?? 0,
      isOverridden: overriddenNodeIds.has(node.id),
    },
  }));
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

function buildDepthGroups(
  anchorId: string,
  componentIds: string[],
  edges: Edge[],
): string[][] {
  const idSet = new Set(componentIds);
  const adjacency = new Map<string, string[]>();
  const addAdjacency = (id: string, neighbor: string): void => {
    const existing = adjacency.get(id);
    if (existing === undefined) {
      adjacency.set(id, [neighbor]);
    } else {
      existing.push(neighbor);
    }
  };
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) {
      continue;
    }
    addAdjacency(edge.source, edge.target);
    addAdjacency(edge.target, edge.source);
  }

  const visited = new Set([anchorId]);
  const depthGroups: string[][] = [[anchorId]];
  let frontier = [anchorId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        next.push(neighbor);
      }
    }
    if (next.length === 0) {
      break;
    }
    depthGroups.push(next);
    frontier = next;
  }
  const unreached = componentIds.filter((id) => !visited.has(id));
  if (unreached.length > 0) {
    depthGroups.push(unreached);
  }
  return depthGroups;
}

interface RingPoint {
  x: number;
  y: number;
}

function radialRingPositions(depthGroups: string[][]): Map<string, RingPoint> {
  const positions = new Map<string, RingPoint>();
  const anchorId = depthGroups[0]?.[0];
  if (anchorId !== undefined) {
    positions.set(anchorId, { x: 0, y: 0 });
  }

  let radius = RING_BASE_RADIUS;
  for (let depth = 1; depth < depthGroups.length; depth += 1) {
    const ids = depthGroups[depth] ?? [];
    let index = 0;
    while (index < ids.length) {
      const capacity = Math.max(1, Math.floor((2 * Math.PI * radius) / RING_NODE_ARC));
      const take = Math.min(capacity, ids.length - index);
      for (let k = 0; k < take; k += 1) {
        const id = ids[index + k];
        if (id === undefined) {
          continue;
        }
        const angle = (2 * Math.PI * k) / take;
        positions.set(id, {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      }
      index += take;
      radius += RING_GAP;
    }
  }
  return positions;
}

interface PositionedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function separateOverlaps(boxes: PositionedBox[]): void {
  const PADDING = 24;
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
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
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

interface RingChild {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function layoutGraph(nodes: EntityNode[], edges: Edge[]): EntityNode[] {
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
    const anchor = componentNodes.find((node) => node.data.isRoot) ?? componentNodes[0];

    const depthGroups =
      anchor === undefined ? [] : buildDepthGroups(anchor.id, componentIds, edges);
    const ringPositions = radialRingPositions(depthGroups);

    let children: RingChild[] = componentNodes.map((node) => {
      const point = ringPositions.get(node.id) ?? { x: 0, y: 0 };
      return {
        id: node.id,
        x: point.x,
        y: point.y,
        width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
        height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
      };
    });

    const boxes: PositionedBox[] = children.map((child) => ({
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
    }));
    separateOverlaps(boxes);
    children = children.map((child, index) => ({
      ...child,
      x: boxes[index]?.x ?? child.x,
      y: boxes[index]?.y ?? child.y,
    }));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const child of children) {
      minX = Math.min(minX, child.x);
      maxX = Math.max(maxX, child.x + child.width);
      minY = Math.min(minY, child.y);
      maxY = Math.max(maxY, child.y + child.height);
    }

    for (const child of children) {
      const node = byId.get(child.id);
      if (node === undefined) {
        continue;
      }
      laidOut.push({
        ...node,
        position: {
          x: offsetX + child.x - minX,
          y: child.y - minY - (maxY - minY) / 2,
        },
      });
    }

    offsetX += maxX - minX + COMPONENT_MARGIN;
  }

  return laidOut;
}
