import { describe, expect, it } from "vitest";
import type { Finding } from "@/lib/findings";
import {
  deepestOwnershipChains,
  edgeTypeBreakdown,
  investigationCoverage,
  possibleMatchPairs,
  providerBreakdown,
  riskRankedEntities,
  sanctionsByOrgan,
  sectorBreakdown,
  topConnectedEntities,
  totalFineAmount,
} from "@/lib/graph-stats";
import type { OverlayResult } from "@/lib/overlay";
import type {
  ApiEdge,
  ApiNode,
  CnaeNode,
  CompanyNode,
  OwnsCompanyEdge,
  PersonNode,
  PlainEdge,
  PoliticalExposureNode,
  PossiblyMatchesEdge,
  SanctionNode,
  TextSourceNode,
} from "@/types/api";

function revision(provider = "brasilapi") {
  return { fetched_at: "2026-08-21T14:00:00Z", merged_at: null, provider };
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

function sanction(
  id: string,
  organ: "CEIS" | "CNEP" | "CEPIM" | "CEAF" = "CEIS",
  fineAmount: string | null = null,
): SanctionNode {
  return {
    content_id: `c-${id}`,
    end_date: null,
    fine_amount: fineAmount,
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

function textSource(id: string): TextSourceNode {
  return {
    content_id: `c-${id}`,
    id,
    revision: revision(),
    text: "texto",
    type: "text_source",
  };
}

function politicalExposure(id: string): PoliticalExposureNode {
  return {
    content_id: `c-${id}`,
    cpf: "cpf1",
    exercise_end_date: null,
    exercise_start_date: null,
    function_acronym: null,
    function_description: "Deputado",
    function_level: null,
    government_body_code: null,
    government_body_name: "Câmara",
    grace_period_end_date: null,
    id,
    revision: revision(),
    type: "political_exposure",
  };
}

function cnae(id: string, code: string, description: string): CnaeNode {
  return {
    code,
    content_id: `c-${id}`,
    description,
    id,
    revision: revision(),
    type: "cnae",
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

function overlay(nodes: ApiNode[], edges: ApiEdge[]): OverlayResult {
  return { conflicts: { edges: {}, nodes: {} }, edges, nodes, roots: new Set() };
}

describe("topConnectedEntities", () => {
  it("ranks entities by degree, excluding text sources", () => {
    const hub = company("cnpj1", "Acme LTDA");
    const a = person("cpf1", "Fulano");
    const b = person("cpf2", "Beltrano");
    const findings = topConnectedEntities(
      overlay(
        [hub, a, b],
        [
          ownsEdge("person_owns_company", "cpf1", "cnpj1"),
          ownsEdge("person_owns_company", "cpf2", "cnpj1"),
        ],
      ),
      6,
    );
    expect(findings[0]?.node.id).toBe("cnpj1");
    expect(findings[0]?.degree).toBe(2);
  });

  it("returns an empty list for a graph with no edges", () => {
    expect(
      topConnectedEntities(overlay([company("cnpj1", "Acme LTDA")], []), 6),
    ).toHaveLength(0);
  });
});

describe("possibleMatchPairs", () => {
  it("sorts pairs by confidence, descending", () => {
    const a = person("cpf1", "Fulano", "***444777**");
    const b = person("cpf2", "Fulano da Silva", "111444777**");
    const c = person("cpf3", "Ciclano", "***111222**");
    const pairs = possibleMatchPairs(
      overlay(
        [a, b, c],
        [
          possiblyMatches("cpf1", "cpf2", "0.5"),
          possiblyMatches("cpf1", "cpf3", "0.9"),
        ],
      ),
    );
    expect(pairs.map((p) => p.confidencePercent)).toEqual([90, 50]);
  });

  it("returns an empty list when no possibly_matches edge exists", () => {
    expect(possibleMatchPairs(overlay([person("cpf1", "Fulano")], []))).toHaveLength(0);
  });
});

describe("sanctionsByOrgan", () => {
  it("counts sanctions per organ, omitting organs with zero", () => {
    const breakdown = sanctionsByOrgan(
      overlay(
        [sanction("s1", "CEIS"), sanction("s2", "CEIS"), sanction("s3", "CNEP")],
        [],
      ),
    );
    expect(breakdown).toEqual([
      { count: 2, organ: "CEIS" },
      { count: 1, organ: "CNEP" },
    ]);
  });

  it("returns an empty list when there is no sanction node", () => {
    expect(sanctionsByOrgan(overlay([company("cnpj1", "Acme LTDA")], []))).toHaveLength(
      0,
    );
  });
});

describe("totalFineAmount", () => {
  it("sums BRL-formatted and plain-decimal amounts, tracking unparsed separately", () => {
    const result = totalFineAmount(
      overlay(
        [
          sanction("s1", "CEIS", "1.234,56"),
          sanction("s2", "CEIS", "100.50"),
          sanction("s3", "CEIS", null),
          sanction("s4", "CEIS", "indisponível"),
        ],
        [],
      ),
    );
    expect(result.total).toBeCloseTo(1335.06, 2);
    expect(result.unparsedCount).toBe(1);
  });

  it("returns zero total and zero unparsed for a graph with no sanction", () => {
    expect(totalFineAmount(overlay([company("cnpj1", "Acme LTDA")], []))).toEqual({
      total: 0,
      unparsedCount: 0,
    });
  });
});

describe("deepestOwnershipChains", () => {
  it("counts the number of ownership links stacked above a company", () => {
    const grandparent = company("cnpj1", "Holding Um");
    const parent = company("cnpj2", "Holding Dois");
    const child = company("cnpj3", "Operacional");
    const chains = deepestOwnershipChains(
      overlay(
        [grandparent, parent, child],
        [
          ownsEdge("company_owns_company", "cnpj1", "cnpj2"),
          ownsEdge("company_owns_company", "cnpj2", "cnpj3"),
        ],
      ),
      5,
    );
    expect(chains[0]).toMatchObject({ depth: 2 });
    expect(chains[0]?.company.id).toBe("cnpj3");
  });

  it("does not loop forever on cross-ownership between two companies", () => {
    const a = company("cnpj1", "Empresa A");
    const b = company("cnpj2", "Empresa B");
    const chains = deepestOwnershipChains(
      overlay(
        [a, b],
        [
          ownsEdge("company_owns_company", "cnpj1", "cnpj2"),
          ownsEdge("company_owns_company", "cnpj2", "cnpj1"),
        ],
      ),
      5,
    );
    expect(chains).toHaveLength(2);
    for (const chain of chains) {
      expect(Number.isFinite(chain.depth)).toBe(true);
    }
  });

  it("omits a company with no owner edge above it", () => {
    const chains = deepestOwnershipChains(
      overlay([company("cnpj1", "Acme LTDA")], []),
      5,
    );
    expect(chains).toHaveLength(0);
  });
});

describe("sectorBreakdown", () => {
  it("counts companies per CNAE, sorted by count descending", () => {
    const a = company("cnpj1", "Acme LTDA");
    const b = company("cnpj2", "Beta LTDA");
    const c = company("cnpj3", "Gama LTDA");
    const retail = cnae("cnae1", "4711301", "Comércio varejista");
    const consulting = cnae("cnae2", "7020400", "Consultoria em gestão");
    const breakdown = sectorBreakdown(
      overlay(
        [a, b, c, retail, consulting],
        [
          edge("company_has_cnae", "cnpj1", "cnae1"),
          edge("company_has_cnae", "cnpj2", "cnae1"),
          edge("company_has_cnae", "cnpj3", "cnae2"),
        ],
      ),
    );
    expect(breakdown).toEqual([
      { cnae: retail, count: 2 },
      { cnae: consulting, count: 1 },
    ]);
  });

  it("returns an empty list when no company has a CNAE edge", () => {
    expect(sectorBreakdown(overlay([company("cnpj1", "Acme LTDA")], []))).toHaveLength(
      0,
    );
  });
});

describe("providerBreakdown", () => {
  it("counts nodes per provider, excluding text sources", () => {
    const a = { ...person("cpf1", "Fulano"), revision: revision("kipflow") };
    const b = { ...person("cpf2", "Beltrano"), revision: revision("kipflow") };
    const c = { ...company("cnpj1", "Acme LTDA"), revision: revision("brasilapi") };
    const breakdown = providerBreakdown(overlay([a, b, c, textSource("t1")], []));
    expect(breakdown).toEqual([
      { count: 2, provider: "kipflow" },
      { count: 1, provider: "brasilapi" },
    ]);
  });

  it("returns an empty list for an overlay with no nodes", () => {
    expect(providerBreakdown(overlay([], []))).toHaveLength(0);
  });
});

describe("edgeTypeBreakdown", () => {
  it("counts edges per type, omitting types absent from the overlay", () => {
    const a = person("cpf1", "Fulano");
    const b = person("cpf2", "Beltrano");
    const c = company("cnpj1", "Acme LTDA");
    const breakdown = edgeTypeBreakdown(
      overlay(
        [a, b, c],
        [
          edge("person_has_email", "cpf1", "cpf1"),
          edge("person_has_email", "cpf2", "cpf2"),
          ownsEdge("person_owns_company", "cpf1", "cnpj1"),
        ],
      ),
    );
    expect(breakdown).toEqual([
      { count: 2, type: "person_has_email" },
      { count: 1, type: "person_owns_company" },
    ]);
  });

  it("returns an empty list for an overlay with no edges", () => {
    expect(edgeTypeBreakdown(overlay([person("cpf1", "Fulano")], []))).toHaveLength(0);
  });
});

describe("investigationCoverage", () => {
  it("computes the fraction of person/company nodes covered by each signal", () => {
    const sanctioned = person("cpf1", "Fulano");
    const exposed = person("cpf2", "Beltrano");
    const clean = company("cnpj1", "Acme LTDA");
    const metrics = investigationCoverage(
      overlay(
        [sanctioned, exposed, clean, sanction("s1"), politicalExposure("pe1")],
        [
          edge("person_received_sanction", "cpf1", "s1"),
          edge("person_has_political_exposure", "cpf2", "pe1"),
        ],
      ),
    );
    const byKey = Object.fromEntries(metrics.map((m) => [m.key, m.percent]));
    expect(byKey["sanction"]).toBe(33);
    expect(byKey["political_exposure"]).toBe(33);
    expect(byKey["legal_process"]).toBe(0);
  });

  it("returns zero for every metric when no person/company node exists", () => {
    const metrics = investigationCoverage(overlay([textSource("t1")], []));
    for (const metric of metrics) {
      expect(metric.percent).toBe(0);
      expect(Number.isNaN(metric.percent)).toBe(false);
    }
  });
});

describe("riskRankedEntities", () => {
  function finding(overrides: Partial<Finding>): Finding {
    return {
      category: "fraude",
      description: "desc",
      id: `f-${String(Math.random())}`,
      nodeIds: [],
      severity: "alto",
      title: "titulo",
      ...overrides,
    };
  }

  it("ranks a single high-severity citation above two low-severity citations", () => {
    const highRisk = person("cpf1", "Fulano");
    const lowRisk = person("cpf2", "Beltrano");
    const ranked = riskRankedEntities(
      overlay([highRisk, lowRisk], []),
      [
        finding({ nodeIds: ["cpf1"], severity: "alto" }),
        finding({ nodeIds: ["cpf2"], severity: "baixo" }),
        finding({ nodeIds: ["cpf2"], severity: "baixo" }),
      ],
      5,
    );
    expect(ranked[0]?.node.id).toBe("cpf1");
    expect(ranked[0]?.score).toBe(3);
    expect(ranked[0]?.topSeverity).toBe("alto");
    expect(ranked[1]?.score).toBe(2);
  });

  it("breaks a score tie by degree", () => {
    const hub = company("cnpj1", "Acme LTDA");
    const leaf = person("cpf1", "Fulano");
    const ranked = riskRankedEntities(
      overlay(
        [hub, leaf, person("cpf2", "Ciclano")],
        [ownsEdge("person_owns_company", "cpf2", "cnpj1")],
      ),
      [
        finding({ nodeIds: ["cnpj1"], severity: "medio" }),
        finding({ nodeIds: ["cpf1"], severity: "medio" }),
      ],
      5,
    );
    expect(ranked[0]?.node.id).toBe("cnpj1");
  });

  it("returns an empty list when no finding cites a node in the overlay", () => {
    expect(
      riskRankedEntities(overlay([person("cpf1", "Fulano")], []), [], 5),
    ).toHaveLength(0);
  });
});
