import { extractLabel } from "@/lib/graph-adapter";
import type { OverlayResult } from "@/lib/overlay";
import { nodeTypeLabel } from "@/lib/relationships";
import type { ApiNode, EdgeType } from "@/types/api";

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

export interface PossibleMatchPair {
  a: ApiNode;
  b: ApiNode;
  confidencePercent: number;
}

export function possibleMatchPairs(overlay: OverlayResult): PossibleMatchPair[] {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const pairs: PossibleMatchPair[] = [];
  for (const edge of overlay.edges) {
    if (edge.type !== "possibly_matches") {
      continue;
    }
    const a = nodeById.get(edge.source_id);
    const b = nodeById.get(edge.target_id);
    if (a === undefined || b === undefined) {
      continue;
    }
    pairs.push({ a, b, confidencePercent: Math.round(Number(edge.confidence) * 100) });
  }
  return pairs.sort((x, y) => y.confidencePercent - x.confidencePercent);
}

const SANCTION_ORGANS = ["CEIS", "CNEP", "CEPIM", "CEAF"] as const;
type SanctionOrgan = (typeof SANCTION_ORGANS)[number];

export interface SanctionBreakdown {
  count: number;
  organ: SanctionOrgan;
}

export function sanctionsByOrgan(overlay: OverlayResult): SanctionBreakdown[] {
  const counts = new Map<SanctionOrgan, number>();
  for (const node of overlay.nodes) {
    if (node.type !== "sanction") {
      continue;
    }
    counts.set(node.organ, (counts.get(node.organ) ?? 0) + 1);
  }
  return SANCTION_ORGANS.filter((organ) => (counts.get(organ) ?? 0) > 0).map(
    (organ) => ({
      count: counts.get(organ) ?? 0,
      organ,
    }),
  );
}

function parseFineAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (cleaned === "") {
    return null;
  }
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = cleaned.replaceAll(".", "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replaceAll(",", "");
  } else {
    normalized = cleaned;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export interface FineAmountTotal {
  total: number;
  unparsedCount: number;
}

export function totalFineAmount(overlay: OverlayResult): FineAmountTotal {
  let total = 0;
  let unparsedCount = 0;
  for (const node of overlay.nodes) {
    if (node.type !== "sanction" || node.fine_amount === null) {
      continue;
    }
    const parsed = parseFineAmount(node.fine_amount);
    if (parsed === null) {
      unparsedCount += 1;
    } else {
      total += parsed;
    }
  }
  return { total, unparsedCount };
}

export interface OwnershipChain {
  company: ApiNode;
  depth: number;
}

const OWNS_COMPANY_EDGE_TYPES = new Set<EdgeType>([
  "person_owns_company",
  "company_owns_company",
]);

export function deepestOwnershipChains(
  overlay: OverlayResult,
  limit: number,
): OwnershipChain[] {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const ownerEdgesByTarget = new Map<string, string[]>();
  for (const edge of overlay.edges) {
    if (!OWNS_COMPANY_EDGE_TYPES.has(edge.type)) {
      continue;
    }
    const owners = ownerEdgesByTarget.get(edge.target_id) ?? [];
    owners.push(edge.source_id);
    ownerEdgesByTarget.set(edge.target_id, owners);
  }

  const memo = new Map<string, number>();

  function depthOf(companyId: string, visiting: Set<string>): number {
    const memoized = memo.get(companyId);
    if (memoized !== undefined) {
      return memoized;
    }
    if (visiting.has(companyId)) {
      return 0;
    }
    visiting.add(companyId);
    let maxDepth = 0;
    for (const ownerId of ownerEdgesByTarget.get(companyId) ?? []) {
      const owner = nodeById.get(ownerId);
      const ownerDepth = owner?.type === "company" ? depthOf(owner.id, visiting) : 0;
      maxDepth = Math.max(maxDepth, 1 + ownerDepth);
    }
    visiting.delete(companyId);
    memo.set(companyId, maxDepth);
    return maxDepth;
  }

  return overlay.nodes
    .filter((node): node is ApiNode & { type: "company" } => node.type === "company")
    .map((company) => ({ company, depth: depthOf(company.id, new Set()) }))
    .filter((entry) => entry.depth > 0)
    .sort(
      (a, b) =>
        b.depth - a.depth ||
        extractLabel(a.company).localeCompare(extractLabel(b.company), "pt-BR"),
    )
    .slice(0, limit);
}

export interface SectorBreakdown {
  cnae: ApiNode;
  count: number;
}

export function sectorBreakdown(overlay: OverlayResult): SectorBreakdown[] {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const counts = new Map<string, number>();
  for (const edge of overlay.edges) {
    if (edge.type !== "company_has_cnae") {
      continue;
    }
    counts.set(edge.target_id, (counts.get(edge.target_id) ?? 0) + 1);
  }
  const breakdown: SectorBreakdown[] = [];
  for (const [cnaeId, count] of counts) {
    const cnae = nodeById.get(cnaeId);
    if (cnae?.type !== "cnae") {
      continue;
    }
    breakdown.push({ cnae, count });
  }
  return breakdown.sort(
    (a, b) =>
      b.count - a.count ||
      extractLabel(a.cnae).localeCompare(extractLabel(b.cnae), "pt-BR"),
  );
}
