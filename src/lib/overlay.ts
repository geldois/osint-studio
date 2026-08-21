import { edgeKey } from "@/lib/graph-adapter";
import type { ApiEdge, ApiNode, GraphSchema } from "@/types/api";

export interface OverlayConflicts {
  edges: Record<string, ApiEdge[]>;
  nodes: Record<string, ApiNode[]>;
}

export interface OverlayResult {
  conflicts: OverlayConflicts;
  edges: ApiEdge[];
  nodes: ApiNode[];
  roots: Set<string>;
}

interface Provenanced {
  content_id: string;
  revision: { fetched_at: string };
}

function distinctByContentIdOldestFirst<T extends Provenanced>(candidates: T[]): T[] {
  const byContentId = new Map<string, T>();
  for (const candidate of candidates) {
    byContentId.set(candidate.content_id, candidate);
  }
  return [...byContentId.values()].sort((a, b) =>
    a.revision.fetched_at.localeCompare(b.revision.fetched_at),
  );
}

function newestByFetchedAtThenContentId<T extends Provenanced>(distinct: T[]): T {
  return distinct.reduce((best, candidate) => {
    if (candidate.revision.fetched_at !== best.revision.fetched_at) {
      return candidate.revision.fetched_at > best.revision.fetched_at
        ? candidate
        : best;
    }
    return candidate.content_id > best.content_id ? candidate : best;
  });
}

export function overlayRevisions(
  revisions: GraphSchema[],
  nodeOverrides: Record<string, ApiNode>,
  edgeOverrides: Record<string, ApiEdge>,
): OverlayResult {
  const nodeCandidates = new Map<string, ApiNode[]>();
  const edgeCandidates = new Map<string, ApiEdge[]>();
  const roots = new Set<string>();

  for (const revision of revisions) {
    roots.add(revision.root_id);
    for (const node of revision.nodes) {
      const existing = nodeCandidates.get(node.id);
      if (existing === undefined) {
        nodeCandidates.set(node.id, [node]);
      } else {
        existing.push(node);
      }
    }
    for (const edge of revision.edges) {
      const key = edgeKey(edge);
      const existing = edgeCandidates.get(key);
      if (existing === undefined) {
        edgeCandidates.set(key, [edge]);
      } else {
        existing.push(edge);
      }
    }
  }

  const nodeConflicts: Record<string, ApiNode[]> = {};
  const nodes: ApiNode[] = [];
  for (const [id, candidates] of nodeCandidates) {
    const distinct = distinctByContentIdOldestFirst(candidates);
    if (distinct.length > 1) {
      nodeConflicts[id] = distinct;
    }
    nodes.push(nodeOverrides[id] ?? newestByFetchedAtThenContentId(distinct));
  }

  const edgeConflicts: Record<string, ApiEdge[]> = {};
  const edges: ApiEdge[] = [];
  for (const [key, candidates] of edgeCandidates) {
    const distinct = distinctByContentIdOldestFirst(candidates);
    if (distinct.length > 1) {
      edgeConflicts[key] = distinct;
    }
    edges.push(edgeOverrides[key] ?? newestByFetchedAtThenContentId(distinct));
  }

  return {
    conflicts: { edges: edgeConflicts, nodes: nodeConflicts },
    edges,
    nodes,
    roots,
  };
}

const FETCHED_AT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatFetchedAt(isoUtc: string): string {
  return FETCHED_AT_FORMATTER.format(new Date(isoUtc));
}

export function pruneSelection(
  selected: string[],
  availableContentIds: ReadonlySet<string>,
): string[] {
  return selected.filter((contentId) => availableContentIds.has(contentId));
}
