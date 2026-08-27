import { describe, expect, it } from "vitest";
import {
  ApiEdgeSchema,
  ApiNodeSchema,
  EntityRecordSchema,
  EntityRefSchema,
  GraphSchemaSchema,
  RevisionSchema,
  TextPatternCatalogSchema,
  TokenResponseSchema,
} from "@/lib/api-schemas";

const REVISION = {
  fetched_at: "2026-08-21T14:03:00Z",
  merged_at: null,
  provider: "kipflow",
};

const PERSON_NODE = {
  type: "person",
  age_range: null,
  birthdate: null,
  content_id: "6e5a9a2c-2d38-5f2a-9a6f-1c0f7b0f8a11",
  cpf: "111.444.777-35",
  id: "19f3e22a-5a75-5106-9364-ccaf1edd7c33",
  name: null,
  registration_date: null,
  registration_status: null,
  revision: REVISION,
};

const MENTIONED_IN_TEXT_EDGE = {
  content_id: "1a2b3c4d-5e6f-5a7b-8c9d-0e1f2a3b4c5d",
  id: "8673c58b-a0c2-5320-8e97-a6f25f0bee29",
  revision: REVISION,
  source_id: "19f3e22a-5a75-5106-9364-ccaf1edd7c33",
  target_id: "c60d69f1-1038-548b-87f4-f0216866df14",
  type: "person_mentioned_in_text",
  matched_field: "cpf",
  pattern_name: "CPF_LOOSE",
};

const COMPANY_NODE = {
  content_id: "b7d1f0e2-3c44-5a66-8b90-2d4e6f8a0c12",
  id: "c1",
  revision: REVISION,
  type: "company",
  cnpj: "00000000000191",
  legal_name: null,
  trade_name: null,
  registration_status: null,
  registration_status_date: null,
  registration_status_reason: null,
  size_category: null,
  legal_nature: null,
  share_capital: null,
  activity_start_date: null,
  is_headquarters: null,
};

const PATTERN_CATALOG = {
  patterns: [
    { name: "CPF_LOOSE", node_type: "Person", fields: ["cpf"] },
    { name: "CPF_LABELED", node_type: "Person", fields: ["cpf"] },
    { name: "CNPJ_LOOSE", node_type: "Company", fields: ["cnpj"] },
    { name: "CNPJ_LABELED", node_type: "Company", fields: ["cnpj"] },
    { name: "CEP_AND_NUMBER", node_type: "Address", fields: ["cep", "number"] },
  ],
  bundles: [{ id: "brazilian_documents_v1", pattern_names: ["CPF_LOOSE"] }],
};

describe("TokenResponseSchema", () => {
  it("parses a valid token response", () => {
    const result = TokenResponseSchema.safeParse({
      access_token: "abc123",
      token_type: "bearer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a response missing access_token", () => {
    const result = TokenResponseSchema.safeParse({ token_type: "bearer" });
    expect(result.success).toBe(false);
  });

  it("rejects a response with the wrong token_type", () => {
    const result = TokenResponseSchema.safeParse({
      access_token: "abc123",
      token_type: "basic",
    });
    expect(result.success).toBe(false);
  });
});

describe("RevisionSchema", () => {
  it("parses a revision that never went through a merge", () => {
    expect(RevisionSchema.safeParse(REVISION).success).toBe(true);
  });

  it("parses a merged revision, sub-second precision included", () => {
    const result = RevisionSchema.safeParse({
      fetched_at: "2026-08-21T14:03:00.123456Z",
      merged_at: "2026-08-21T14:03:01Z",
      provider: "text_ingestion",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a timestamp carrying an offset instead of UTC", () => {
    const result = RevisionSchema.safeParse({
      ...REVISION,
      fetched_at: "2026-08-21T11:03:00-03:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a timestamp that is not ISO 8601", () => {
    const result = RevisionSchema.safeParse({
      ...REVISION,
      fetched_at: "21/08/2026 14:03",
    });
    expect(result.success).toBe(false);
  });

  it("rejects merged_at omitted, since null is what an unmerged revision sends", () => {
    const result = RevisionSchema.safeParse({
      fetched_at: "2026-08-21T14:03:00Z",
      provider: "kipflow",
    });
    expect(result.success).toBe(false);
  });
});

describe("ApiNodeSchema", () => {
  it("parses a valid node of each type", () => {
    const address = {
      content_id: "9f8e7d6c-5b4a-5392-8172-6f5e4d3c2b1a",
      id: "a1",
      revision: REVISION,
      type: "address",
      cep: "01310-100",
      city: null,
      complement: null,
      neighborhood: null,
      number: "100",
      state: null,
      street: null,
    };
    expect(ApiNodeSchema.safeParse(PERSON_NODE).success).toBe(true);
    expect(ApiNodeSchema.safeParse(address).success).toBe(true);
  });

  it("preserves birthdate when the provider supplied one", () => {
    const result = ApiNodeSchema.safeParse({
      ...PERSON_NODE,
      birthdate: "1980-05-02",
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "person") {
      expect(result.data.birthdate).toBe("1980-05-02");
    }
  });

  it("exposes content_id separately from id, so two revisions of one node stay distinguishable", () => {
    const result = ApiNodeSchema.safeParse(PERSON_NODE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content_id).not.toBe(result.data.id);
    }
  });

  it("carries the provenance of the graph the node arrived in", () => {
    const result = ApiNodeSchema.safeParse(PERSON_NODE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revision.provider).toBe("kipflow");
      expect(result.data.revision.merged_at).toBeNull();
    }
  });

  it("rejects a node missing revision, the shape the backend served before provenance", () => {
    const result = ApiNodeSchema.safeParse({
      ...PERSON_NODE,
      revision: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a node missing content_id", () => {
    const result = ApiNodeSchema.safeParse({
      ...PERSON_NODE,
      content_id: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a person node missing birthdate entirely", () => {
    const result = ApiNodeSchema.safeParse({
      ...PERSON_NODE,
      birthdate: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a node missing a required field for its type", () => {
    const result = ApiNodeSchema.safeParse({ ...PERSON_NODE, cpf: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects a node with an unknown type", () => {
    const result = ApiNodeSchema.safeParse({
      ...PERSON_NODE,
      type: "unknown_type",
    });
    expect(result.success).toBe(false);
  });
});

describe("ApiEdgeSchema", () => {
  it("parses a person_owns_company edge", () => {
    const result = ApiEdgeSchema.safeParse({
      content_id: "2b3c4d5e-6f70-5182-9394-a5b6c7d8e9f0",
      id: "e1",
      revision: REVISION,
      source_id: "p1",
      target_id: "c1",
      type: "person_owns_company",
      entry_date: "2020-01-01",
      role: "owner",
    });
    expect(result.success).toBe(true);
  });

  it("parses a company_owns_company edge, the QSA shape for a corporate member", () => {
    const result = ApiEdgeSchema.safeParse({
      content_id: "3c4d5e6f-7081-5293-a4b5-c6d7e8f90a1b",
      id: "e1",
      revision: REVISION,
      source_id: "c1",
      target_id: "c2",
      type: "company_owns_company",
      entry_date: "2020-01-01",
      role: "Sócio-Administrador",
    });
    expect(result.success).toBe(true);
  });

  it("parses a mentioned-in-text edge carrying pattern_name", () => {
    expect(ApiEdgeSchema.safeParse(MENTIONED_IN_TEXT_EDGE).success).toBe(true);
  });

  it("rejects a mentioned-in-text edge carrying the retired pattern_id", () => {
    const result = ApiEdgeSchema.safeParse({
      ...MENTIONED_IN_TEXT_EDGE,
      pattern_name: undefined,
      pattern_id: "CPF_LOOSE",
    });
    expect(result.success).toBe(false);
  });

  it("parses a plain edge type (company_has_email)", () => {
    const result = ApiEdgeSchema.safeParse({
      content_id: "4d5e6f70-8192-53a4-b5c6-d7e8f90a1b2c",
      id: "e2",
      revision: REVISION,
      source_id: "c1",
      target_id: "email1",
      type: "company_has_email",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an edge missing revision", () => {
    const result = ApiEdgeSchema.safeParse({
      ...MENTIONED_IN_TEXT_EDGE,
      revision: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an edge missing source_id", () => {
    const result = ApiEdgeSchema.safeParse({
      ...MENTIONED_IN_TEXT_EDGE,
      source_id: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an edge with an unknown type", () => {
    const result = ApiEdgeSchema.safeParse({
      ...MENTIONED_IN_TEXT_EDGE,
      type: "person_dislikes_company",
    });
    expect(result.success).toBe(false);
  });
});

describe("GraphSchemaSchema", () => {
  it("parses a graph with one node and one edge", () => {
    const result = GraphSchemaSchema.safeParse({
      content_id: "5e6f7081-92a3-54b5-c6d7-e8f90a1b2c3d",
      root_id: "c1",
      revision: REVISION,
      nodes: [COMPANY_NODE],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects the three-field shape the backend served before provenance", () => {
    const result = GraphSchemaSchema.safeParse({
      root_id: "c1",
      nodes: [COMPANY_NODE],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a graph whose node has a malformed type", () => {
    const result = GraphSchemaSchema.safeParse({
      content_id: "5e6f7081-92a3-54b5-c6d7-e8f90a1b2c3d",
      root_id: "c1",
      revision: REVISION,
      nodes: [{ content_id: "x", id: "c1", revision: REVISION, type: "company" }],
      edges: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("TextPatternCatalogSchema", () => {
  it("parses the catalog the backend actually returns", () => {
    const result = TextPatternCatalogSchema.safeParse(PATTERN_CATALOG);
    expect(result.success).toBe(true);
  });

  it("rejects a bare array, the shape the frontend used to assume", () => {
    const result = TextPatternCatalogSchema.safeParse(PATTERN_CATALOG.patterns);
    expect(result.success).toBe(false);
  });

  it("rejects a catalog missing bundles", () => {
    const result = TextPatternCatalogSchema.safeParse({
      patterns: PATTERN_CATALOG.patterns,
    });
    expect(result.success).toBe(false);
  });
});

const ENTITY_REF = { id: "e1", content_id: "c1" };

describe("EntityRefSchema", () => {
  it("parses id and content_id", () => {
    expect(EntityRefSchema.safeParse(ENTITY_REF).success).toBe(true);
  });

  it("rejects a ref missing content_id", () => {
    expect(EntityRefSchema.safeParse({ id: "e1" }).success).toBe(false);
  });
});

describe("EntityRecordSchema", () => {
  it("parses an expanded attempt carrying an entity_ref", () => {
    const result = EntityRecordSchema.safeParse({
      id: "rec1",
      entity_id: "e1",
      entity_ref: ENTITY_REF,
      outcome: "expanded",
      provider: "kipflow",
      requested_at: "2026-08-21T14:03:00Z",
      username: "alice",
    });
    expect(result.success).toBe(true);
  });

  it("parses a blocked attempt with entity_ref null", () => {
    const result = EntityRecordSchema.safeParse({
      id: "rec1",
      entity_id: "e1",
      entity_ref: null,
      outcome: "failed",
      provider: "kipflow",
      requested_at: "2026-08-21T14:03:00Z",
      username: "alice",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown outcome", () => {
    const result = EntityRecordSchema.safeParse({
      id: "rec1",
      entity_id: "e1",
      entity_ref: null,
      outcome: "cancelled",
      provider: "kipflow",
      requested_at: "2026-08-21T14:03:00Z",
      username: "alice",
    });
    expect(result.success).toBe(false);
  });

  it("rejects entity_ref omitted, since null is what a contentless outcome sends", () => {
    const result = EntityRecordSchema.safeParse({
      id: "rec1",
      entity_id: "e1",
      outcome: "empty",
      provider: "kipflow",
      requested_at: "2026-08-21T14:03:00Z",
      username: "alice",
    });
    expect(result.success).toBe(false);
  });
});
