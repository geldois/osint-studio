import { extractLabel } from "@/lib/graph-adapter";
import type { OverlayResult } from "@/lib/overlay";
import { edgeTypeLabel, nodeTypeLabel } from "@/lib/relationships";
import type { ApiNode, CompanyNode, EdgeType, PersonNode } from "@/types/api";

export type FindingSeverity = "alto" | "medio" | "baixo";

export type FindingCategory =
  | "conflito_interesse"
  | "fraude"
  | "identidade"
  | "qualidade_dado"
  | "risco_associacao";

export interface Finding {
  category: FindingCategory;
  description: string;
  id: string;
  nodeIds: string[];
  severity: FindingSeverity;
  title: string;
}

const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  alto: "Alto",
  baixo: "Baixo",
  medio: "Médio",
};

export function severityLabel(severity: FindingSeverity): string {
  return SEVERITY_LABELS[severity];
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = { alto: 0, medio: 1, baixo: 2 };

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  conflito_interesse: "Conflito de interesse",
  fraude: "Fraude e desvio",
  identidade: "Identidade",
  qualidade_dado: "Qualidade do dado",
  risco_associacao: "Risco por associação",
};

export function categoryLabel(category: FindingCategory): string {
  return CATEGORY_LABELS[category];
}

type FindingRule = (
  overlay: OverlayResult,
  nodeById: Map<string, ApiNode>,
) => Finding[];

const SANCTION_EDGE_TYPES = new Set<EdgeType>([
  "company_received_sanction",
  "person_received_sanction",
]);

function sanctionRule(
  overlay: OverlayResult,
  nodeById: Map<string, ApiNode>,
): Finding[] {
  const findings: Finding[] = [];
  for (const edge of overlay.edges) {
    if (!SANCTION_EDGE_TYPES.has(edge.type)) {
      continue;
    }
    const holder = nodeById.get(edge.source_id);
    const sanction = nodeById.get(edge.target_id);
    if (holder === undefined || sanction?.type !== "sanction") {
      continue;
    }
    findings.push({
      category: "fraude",
      description:
        `${sanction.sanction_type} (${sanction.sanctioning_body})` +
        (sanction.start_date !== null ? `, desde ${sanction.start_date}` : "") +
        ".",
      id: `sanction:${edge.source_id}:${edge.target_id}`,
      nodeIds: [holder.id, sanction.id],
      severity: "alto",
      title: `${extractLabel(holder)} recebeu sanção ${sanction.organ}`,
    });
  }
  return findings;
}

function associationRiskRule(
  overlay: OverlayResult,
  nodeById: Map<string, ApiNode>,
): Finding[] {
  const sanctionedIds = new Set(
    overlay.edges
      .filter((edge) => SANCTION_EDGE_TYPES.has(edge.type))
      .map((edge) => edge.source_id),
  );
  const findings: Finding[] = [];
  for (const edge of overlay.edges) {
    if (
      (edge.type !== "person_owns_company" && edge.type !== "company_owns_company") ||
      !sanctionedIds.has(edge.source_id)
    ) {
      continue;
    }
    const owner = nodeById.get(edge.source_id);
    const company = nodeById.get(edge.target_id);
    if (owner === undefined || company === undefined) {
      continue;
    }
    findings.push({
      category: "risco_associacao",
      description:
        `${extractLabel(owner)} também recebeu sanção registrada neste grafo — risco reputacional ` +
        "por associação, ainda que a empresa não tenha sido sancionada diretamente.",
      id: `association-risk:${edge.source_id}:${edge.target_id}`,
      nodeIds: [company.id, owner.id],
      severity: "medio",
      title:
        `${extractLabel(company)} tem parte sancionada em sua composição: ${extractLabel(owner)} ` +
        `(${edgeTypeLabel(edge.type)})`,
    });
  }
  return findings;
}

function isPersonOrCompany(node: ApiNode): node is CompanyNode | PersonNode {
  return node.type === "company" || node.type === "person";
}

function addLink(map: Map<string, Set<string>>, key: string, value: string): void {
  const existing = map.get(key);
  if (existing === undefined) {
    map.set(key, new Set([value]));
  } else {
    existing.add(value);
  }
}

const CONTACT_NODE_TYPES = new Set<ApiNode["type"]>(["address", "email", "phone"]);

function sharedContactByDirectOrMentionEdgeRule(
  overlay: OverlayResult,
  nodeById: Map<string, ApiNode>,
): Finding[] {
  const directLinks = new Map<string, Set<string>>();
  const textSourceLinks = new Map<string, Set<string>>();
  const contactTextSources = new Map<string, Set<string>>();

  for (const edge of overlay.edges) {
    const source = nodeById.get(edge.source_id);
    const target = nodeById.get(edge.target_id);
    if (source === undefined || target === undefined) {
      continue;
    }
    for (const [entity, other] of [
      [source, target],
      [target, source],
    ] as const) {
      if (isPersonOrCompany(entity) && CONTACT_NODE_TYPES.has(other.type)) {
        addLink(directLinks, other.id, entity.id);
      }
      if (isPersonOrCompany(entity) && other.type === "text_source") {
        addLink(textSourceLinks, other.id, entity.id);
      }
      if (entity.type === "address" && other.type === "text_source") {
        addLink(contactTextSources, entity.id, other.id);
      }
    }
  }

  const findings: Finding[] = [];
  for (const contact of overlay.nodes) {
    if (!CONTACT_NODE_TYPES.has(contact.type)) {
      continue;
    }
    const linkedIds = new Set(directLinks.get(contact.id) ?? []);
    for (const textSourceId of contactTextSources.get(contact.id) ?? []) {
      for (const id of textSourceLinks.get(textSourceId) ?? []) {
        linkedIds.add(id);
      }
    }
    if (linkedIds.size < 2) {
      continue;
    }
    const entities = [...linkedIds]
      .map((id) => nodeById.get(id))
      .filter((node): node is CompanyNode | PersonNode => node !== undefined);
    findings.push({
      category: "conflito_interesse",
      description:
        `${entities.map((entity) => extractLabel(entity)).join(", ")} compartilham o mesmo ` +
        `${nodeTypeLabel(contact.type).toLowerCase()} sem vínculo societário direto entre si.`,
      id: `shared-contact:${contact.id}`,
      nodeIds: [contact.id, ...entities.map((entity) => entity.id)],
      severity: "medio",
      title:
        `${String(entities.length)} entidades compartilham ` +
        `${nodeTypeLabel(contact.type).toLowerCase()}: ${extractLabel(contact)}`,
    });
  }
  return findings;
}

function possibleMatchRule(
  overlay: OverlayResult,
  nodeById: Map<string, ApiNode>,
): Finding[] {
  const findings: Finding[] = [];
  for (const edge of overlay.edges) {
    if (edge.type !== "possibly_matches") {
      continue;
    }
    const a = nodeById.get(edge.source_id);
    const b = nodeById.get(edge.target_id);
    if (a === undefined || b === undefined) {
      continue;
    }
    const confidence = Math.round(Number(edge.confidence) * 100);
    findings.push({
      category: "identidade",
      description:
        `Confiança de ${String(confidence)}% pela sobreposição de dígitos do CPF. Nenhuma fusão ` +
        "automática foi feita — a revisão fica com o analista.",
      id: `possible-match:${edge.source_id}:${edge.target_id}`,
      nodeIds: [a.id, b.id],
      severity: "medio",
      title: `Possível mesma pessoa: ${extractLabel(a)} ≈ ${extractLabel(b)}`,
    });
  }
  return findings;
}

function conflictRule(
  overlay: OverlayResult,
  nodeById: Map<string, ApiNode>,
): Finding[] {
  const findings: Finding[] = [];
  for (const [nodeId, candidates] of Object.entries(overlay.conflicts.nodes)) {
    const current = nodeById.get(nodeId);
    if (current === undefined) {
      continue;
    }
    findings.push({
      category: "qualidade_dado",
      description:
        `${String(candidates.length)} versões distintas deste dado foram observadas em fontes ou momentos ` +
        "diferentes; a mais recente está em uso. Revise antes de citar em relatório.",
      id: `conflict:${nodeId}`,
      nodeIds: [nodeId],
      severity: "baixo",
      title: `Dado inconsistente entre fontes: ${extractLabel(current)}`,
    });
  }
  return findings;
}

const FINDING_RULES: FindingRule[] = [
  sanctionRule,
  associationRiskRule,
  sharedContactByDirectOrMentionEdgeRule,
  possibleMatchRule,
  conflictRule,
];

export function evaluateFindings(overlay: OverlayResult): Finding[] {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  return FINDING_RULES.flatMap((rule) => rule(overlay, nodeById)).sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.title.localeCompare(b.title, "pt-BR"),
  );
}

export function countBySeverity(findings: Finding[]): Record<FindingSeverity, number> {
  const counts: Record<FindingSeverity, number> = { alto: 0, baixo: 0, medio: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }
  return counts;
}
