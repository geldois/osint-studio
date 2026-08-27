import { describe, expect, it } from "vitest";
import { countBySeverity, evaluateFindings } from "@/lib/findings";
import type { OverlayResult } from "@/lib/overlay";
import type {
  AddressNode,
  ApiEdge,
  ApiNode,
  CompanyNode,
  OwnsCompanyEdge,
  PersonNode,
  PlainEdge,
  PossiblyMatchesEdge,
  SanctionNode,
  TextSourceNode,
} from "@/types/api";

function revision() {
  return { fetched_at: "2026-08-21T14:00:00Z", merged_at: null, provider: "brasilapi" };
}

function person(id: string, name: string, cpf = id): PersonNode {
  return {
    age_range: null,
    birthdate: null,
    content_id: `c-${id}`,
    cpf,
    id,
    name,
    registration_date: null,
    registration_status: null,
    revision: revision(),
    type: "person",
  };
}

function company(id: string, legalName: string, cnpj = id): CompanyNode {
  return {
    activity_start_date: null,
    cnpj,
    content_id: `c-${id}`,
    id,
    is_headquarters: null,
    legal_name: legalName,
    legal_nature: null,
    registration_status: null,
    registration_status_date: null,
    registration_status_reason: null,
    revision: revision(),
    share_capital: null,
    size_category: null,
    trade_name: null,
    type: "company",
  };
}

function address(id: string, street: string): AddressNode {
  return {
    cep: "40000-000",
    city: "Salvador",
    complement: null,
    content_id: `c-${id}`,
    id,
    neighborhood: null,
    number: "100",
    revision: revision(),
    state: "BA",
    street,
    type: "address",
  };
}

function textSource(id: string, text: string): TextSourceNode {
  return { content_id: `c-${id}`, id, revision: revision(), text, type: "text_source" };
}

function sanction(
  id: string,
  organ: "CEIS" | "CNEP" | "CEPIM" | "CEAF" = "CEIS",
): SanctionNode {
  return {
    content_id: `c-${id}`,
    end_date: null,
    fine_amount: null,
    id,
    legal_basis: [],
    organ,
    process_number: null,
    publication_date: null,
    publication_link: "https://example.org",
    revision: revision(),
    sanction_type: "Inidoneidade",
    sanctioning_body: "CGU",
    source_id: `s-${id}`,
    start_date: "2025-01-01",
    type: "sanction",
  };
}

function edge(type: PlainEdge["type"], sourceId: string, targetId: string): PlainEdge {
  return {
    content_id: `edge-${sourceId}-${targetId}`,
    id: `${sourceId}-${targetId}`,
    revision: revision(),
    source_id: sourceId,
    target_id: targetId,
    type,
  };
}

function ownsEdge(
  type: OwnsCompanyEdge["type"],
  sourceId: string,
  targetId: string,
): OwnsCompanyEdge {
  return {
    content_id: `edge-${sourceId}-${targetId}`,
    entry_date: "2020-01-01",
    id: `${sourceId}-${targetId}`,
    revision: revision(),
    role: "sócio-administrador",
    source_id: sourceId,
    target_id: targetId,
    type,
  };
}

function mentionEdge(
  type:
    | "address_mentioned_in_text"
    | "company_mentioned_in_text"
    | "person_mentioned_in_text",
  sourceId: string,
  targetId: string,
): ApiEdge {
  return {
    content_id: `edge-${sourceId}-${targetId}`,
    id: `${sourceId}-${targetId}`,
    matched_field: "cpf",
    pattern_name: "CPF_LOOSE",
    revision: revision(),
    source_id: sourceId,
    target_id: targetId,
    type,
  };
}

function possiblyMatches(
  sourceId: string,
  targetId: string,
  confidence: string,
): PossiblyMatchesEdge {
  return {
    confidence,
    content_id: `edge-${sourceId}-${targetId}`,
    id: `${sourceId}-${targetId}`,
    revision: revision(),
    source_id: sourceId,
    target_id: targetId,
    type: "possibly_matches",
  };
}

function overlay(
  nodes: ApiNode[],
  edges: ApiEdge[],
  conflicts: OverlayResult["conflicts"] = { edges: {}, nodes: {} },
): OverlayResult {
  return { conflicts, edges, nodes, roots: new Set() };
}

describe("evaluateFindings — sanctionRule", () => {
  it("flags a company holding a sanction, severity alto", () => {
    const acme = company("cnpj1", "Acme LTDA");
    const strike = sanction("s1");
    const findings = evaluateFindings(
      overlay([acme, strike], [edge("company_received_sanction", "cnpj1", "s1")]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: "fraude", severity: "alto" });
    expect(findings[0]?.nodeIds).toEqual(["cnpj1", "s1"]);
  });

  it("produces nothing when no sanction edge is present", () => {
    const acme = company("cnpj1", "Acme LTDA");
    expect(evaluateFindings(overlay([acme], []))).toHaveLength(0);
  });
});

describe("evaluateFindings — associationRiskRule", () => {
  it("flags a company whose owner separately holds a sanction", () => {
    const owner = person("cpf1", "Fulano");
    const acme = company("cnpj1", "Acme LTDA");
    const strike = sanction("s1");
    const findings = evaluateFindings(
      overlay(
        [owner, acme, strike],
        [
          ownsEdge("person_owns_company", "cpf1", "cnpj1"),
          edge("person_received_sanction", "cpf1", "s1"),
        ],
      ),
    );
    const associationFindings = findings.filter(
      (f) => f.category === "risco_associacao",
    );
    expect(associationFindings).toHaveLength(1);
    expect(associationFindings[0]).toMatchObject({ severity: "medio" });
    expect(associationFindings[0]?.nodeIds).toEqual(["cnpj1", "cpf1"]);
  });

  it("stays silent when the owner carries no sanction", () => {
    const owner = person("cpf1", "Fulano");
    const acme = company("cnpj1", "Acme LTDA");
    const findings = evaluateFindings(
      overlay([owner, acme], [ownsEdge("person_owns_company", "cpf1", "cnpj1")]),
    );
    expect(findings.filter((f) => f.category === "risco_associacao")).toHaveLength(0);
  });
});

describe("evaluateFindings — sharedContactRule", () => {
  it("flags two companies located at the same address via direct edges", () => {
    const a = company("cnpj1", "Acme LTDA");
    const b = company("cnpj2", "Beta LTDA");
    const addr = address("addr1", "Rua das Flores");
    const findings = evaluateFindings(
      overlay(
        [a, b, addr],
        [
          edge("company_located_at", "cnpj1", "addr1"),
          edge("company_located_at", "cnpj2", "addr1"),
        ],
      ),
    );
    const shared = findings.filter((f) => f.category === "conflito_interesse");
    expect(shared).toHaveLength(1);
    expect(shared[0]?.nodeIds).toEqual(["addr1", "cnpj1", "cnpj2"]);
  });

  it("flags a person and a company co-mentioned with the same address in one ingestion, with no direct edge between them", () => {
    const p = person("cpf1", "Fulano");
    const c = company("cnpj1", "Acme LTDA");
    const addr = address("addr1", "Rua das Flores");
    const source = textSource(
      "t1",
      "Fulano, CPF ..., sócio da Acme LTDA, CNPJ ..., na Rua das Flores",
    );
    const findings = evaluateFindings(
      overlay(
        [p, c, addr, source],
        [
          mentionEdge("person_mentioned_in_text", "cpf1", "t1"),
          mentionEdge("company_mentioned_in_text", "cnpj1", "t1"),
          mentionEdge("address_mentioned_in_text", "addr1", "t1"),
        ],
      ),
    );
    const shared = findings.filter((f) => f.category === "conflito_interesse");
    expect(shared).toHaveLength(1);
    expect(shared[0]?.nodeIds).toEqual(["addr1", "cpf1", "cnpj1"]);
  });

  it("stays silent when only one entity touches the address", () => {
    const a = company("cnpj1", "Acme LTDA");
    const addr = address("addr1", "Rua das Flores");
    const findings = evaluateFindings(
      overlay([a, addr], [edge("company_located_at", "cnpj1", "addr1")]),
    );
    expect(findings.filter((f) => f.category === "conflito_interesse")).toHaveLength(0);
  });
});

describe("evaluateFindings — possibleMatchRule", () => {
  it("surfaces a possibly_matches edge as a finding with rounded confidence", () => {
    const a = person("cpf1", "Fulano", "***444777**");
    const b = person("cpf2", "Fulano da Silva", "111444777**");
    const findings = evaluateFindings(
      overlay([a, b], [possiblyMatches("cpf1", "cpf2", "0.833")]),
    );
    const matches = findings.filter((f) => f.category === "identidade");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.description).toContain("83%");
  });
});

describe("evaluateFindings — conflictRule", () => {
  it("surfaces a node-level overlay conflict as a low-severity finding", () => {
    const older = person("cpf1", "Fulano");
    const newer = person("cpf1", "Fulano de Tal");
    const findings = evaluateFindings(
      overlay([newer], [], { edges: {}, nodes: { cpf1: [older, newer] } }),
    );
    const conflicts = findings.filter((f) => f.category === "qualidade_dado");
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ severity: "baixo" });
  });
});

describe("evaluateFindings — ordering", () => {
  it("sorts alto before medio before baixo", () => {
    const owner = person("cpf1", "Fulano");
    const acme = company("cnpj1", "Acme LTDA");
    const strike = sanction("s1");
    const findings = evaluateFindings(
      overlay(
        [owner, acme, strike],
        [
          ownsEdge("person_owns_company", "cpf1", "cnpj1"),
          edge("person_received_sanction", "cpf1", "s1"),
        ],
        { edges: {}, nodes: { cpf1: [owner, owner] } },
      ),
    );
    const severities = findings.map((f) => f.severity);
    expect(severities).toEqual(
      [...severities].sort((a, b) => {
        const order = { alto: 0, baixo: 2, medio: 1 };
        return order[a] - order[b];
      }),
    );
    expect(severities[0]).toBe("alto");
    expect(severities.at(-1)).toBe("baixo");
  });
});

describe("countBySeverity", () => {
  it("tallies findings per severity, zero-filled", () => {
    const acme = company("cnpj1", "Acme LTDA");
    const strike = sanction("s1");
    const findings = evaluateFindings(
      overlay([acme, strike], [edge("company_received_sanction", "cnpj1", "s1")]),
    );
    expect(countBySeverity(findings)).toEqual({ alto: 1, baixo: 0, medio: 0 });
  });
});
