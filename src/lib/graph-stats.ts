import { extractLabel } from "@/lib/graph-adapter";
import type { Finding, FindingSeverity } from "@/lib/findings";
import type { OverlayResult } from "@/lib/overlay";
import { nodeTypeLabel, nodeTypePluralLabel } from "@/lib/relationships";
import type { ApiNode, NodeType, EdgeType } from "@/types/api";

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

export interface ProviderBreakdown {
  count: number;
  provider: string;
}

export function providerBreakdown(overlay: OverlayResult): ProviderBreakdown[] {
  const counts = new Map<string, number>();
  for (const node of overlay.nodes) {
    if (node.type === "text_source") {
      continue;
    }
    const provider = node.revision.provider;
    counts.set(provider, (counts.get(provider) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([provider, count]) => ({ count, provider }))
    .sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider, "pt-BR"));
}

export interface EdgeTypeBreakdown {
  count: number;
  type: EdgeType;
}

export function edgeTypeBreakdown(overlay: OverlayResult): EdgeTypeBreakdown[] {
  const counts = new Map<EdgeType, number>();
  for (const edge of overlay.edges) {
    counts.set(edge.type, (counts.get(edge.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ count, type }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

export type CoverageKey = "legal_process" | "political_exposure" | "sanction";

export interface CoverageMetric {
  key: CoverageKey;
  percent: number;
}

const COVERAGE_EDGE_TYPES: Record<CoverageKey, Set<EdgeType>> = {
  legal_process: new Set<EdgeType>([
    "person_is_party_in_legal_process",
    "company_is_party_in_legal_process",
  ]),
  political_exposure: new Set<EdgeType>(["person_has_political_exposure"]),
  sanction: new Set<EdgeType>([
    "person_received_sanction",
    "company_received_sanction",
  ]),
};

const COVERAGE_ELIGIBLE_TYPES = new Set<ApiNode["type"]>(["company", "person"]);

export function investigationCoverage(overlay: OverlayResult): CoverageMetric[] {
  const eligibleIds = new Set(
    overlay.nodes
      .filter((node) => COVERAGE_ELIGIBLE_TYPES.has(node.type))
      .map((node) => node.id),
  );
  const coveredByKey: Record<CoverageKey, Set<string>> = {
    legal_process: new Set(),
    political_exposure: new Set(),
    sanction: new Set(),
  };
  for (const edge of overlay.edges) {
    for (const key of Object.keys(coveredByKey) as CoverageKey[]) {
      if (COVERAGE_EDGE_TYPES[key].has(edge.type) && eligibleIds.has(edge.source_id)) {
        coveredByKey[key].add(edge.source_id);
      }
    }
  }
  return (Object.keys(coveredByKey) as CoverageKey[]).map((key) => ({
    key,
    percent:
      eligibleIds.size === 0
        ? 0
        : Math.round((coveredByKey[key].size / eligibleIds.size) * 100),
  }));
}

export interface EntityTypeBreakdown {
  type: NodeType;
  label: string;
  count: number;
}

const ENTITY_BREAKDOWN_EXCLUDED_TYPES = new Set<NodeType>(["text_source"]);

export function entityTypeBreakdown(overlay: OverlayResult): EntityTypeBreakdown[] {
  const counts = new Map<NodeType, number>();
  for (const node of overlay.nodes) {
    if (ENTITY_BREAKDOWN_EXCLUDED_TYPES.has(node.type)) {
      continue;
    }
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ count, label: nodeTypePluralLabel(type), type }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

export interface RiskRankedEntity {
  label: string;
  node: ApiNode;
  score: number;
  topSeverity: FindingSeverity | null;
}

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  alto: 3,
  baixo: 1,
  medio: 2,
};
const SEVERITY_RANK: Record<FindingSeverity, number> = { alto: 0, baixo: 2, medio: 1 };
const RISK_RANKABLE_TYPES = new Set<ApiNode["type"]>(["company", "person"]);

export function riskRankedEntities(
  overlay: OverlayResult,
  findings: Finding[],
  limit: number,
): RiskRankedEntity[] {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const degreeByNode = new Map<string, number>(
    topConnectedEntities(overlay, overlay.nodes.length).map((entry) => [
      entry.node.id,
      entry.degree,
    ]),
  );
  const scoreByNode = new Map<string, number>();
  const topSeverityByNode = new Map<string, FindingSeverity>();
  for (const finding of findings) {
    for (const nodeId of finding.nodeIds) {
      const node = nodeById.get(nodeId);
      if (node === undefined || !RISK_RANKABLE_TYPES.has(node.type)) {
        continue;
      }
      scoreByNode.set(
        nodeId,
        (scoreByNode.get(nodeId) ?? 0) + SEVERITY_WEIGHT[finding.severity],
      );
      const currentTop = topSeverityByNode.get(nodeId);
      if (
        currentTop === undefined ||
        SEVERITY_RANK[finding.severity] < SEVERITY_RANK[currentTop]
      ) {
        topSeverityByNode.set(nodeId, finding.severity);
      }
    }
  }
  return [...scoreByNode.entries()]
    .map(([nodeId, score]) => {
      const node = nodeById.get(nodeId);
      return node === undefined
        ? null
        : {
            label: extractLabel(node),
            node,
            score,
            topSeverity: topSeverityByNode.get(nodeId) ?? null,
          };
    })
    .filter((entry): entry is RiskRankedEntity => entry !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (degreeByNode.get(b.node.id) ?? 0) - (degreeByNode.get(a.node.id) ?? 0) ||
        a.label.localeCompare(b.label, "pt-BR"),
    )
    .slice(0, limit);
}
