import { describe, expect, it } from "vitest";
import {
  ApiEdgeSchema,
  ApiNodeSchema,
  GraphSchemaSchema,
  TextPatternCatalogSchema,
  TokenResponseSchema,
} from "@/lib/api-schemas";

const PERSON_NODE = {
  type: "person",
  age_range: null,
  birthdate: null,
  cpf: "111.444.777-35",
  id: "19f3e22a-5a75-5106-9364-ccaf1edd7c33",
  name: null,
  registration_date: null,
  registration_status: null,
};

const MENTIONED_IN_TEXT_EDGE = {
  id: "8673c58b-a0c2-5320-8e97-a6f25f0bee29",
  source_id: "19f3e22a-5a75-5106-9364-ccaf1edd7c33",
  target_id: "c60d69f1-1038-548b-87f4-f0216866df14",
  type: "person_mentioned_in_text",
  matched_field: "cpf",
  pattern_name: "CPF_LOOSE",
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

describe("ApiNodeSchema", () => {
  it("parses a valid node of each type", () => {
    const address = {
      id: "a1",
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

  it("rejects a person node missing birthdate entirely", () => {
    const result = ApiNodeSchema.safeParse({
      type: "person",
      age_range: null,
      cpf: "111.444.777-35",
      id: "19f3e22a-5a75-5106-9364-ccaf1edd7c33",
      name: null,
      registration_date: null,
      registration_status: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a node missing a required field for its type", () => {
    const result = ApiNodeSchema.safeParse({
      type: "person",
      age_range: null,
      birthdate: null,
      id: "19f3e22a-5a75-5106-9364-ccaf1edd7c33",
      name: null,
      registration_date: null,
      registration_status: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a node with an unknown type", () => {
    const result = ApiNodeSchema.safeParse({ id: "x1", type: "unknown_type" });
    expect(result.success).toBe(false);
  });
});

describe("ApiEdgeSchema", () => {
  it("parses a person_owns_company edge", () => {
    const result = ApiEdgeSchema.safeParse({
      id: "e1",
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
      id: "e1",
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
    const { pattern_name: patternName, ...rest } = MENTIONED_IN_TEXT_EDGE;
    const result = ApiEdgeSchema.safeParse({ ...rest, pattern_id: patternName });
    expect(result.success).toBe(false);
  });

  it("parses a plain edge type (company_has_email)", () => {
    const result = ApiEdgeSchema.safeParse({
      id: "e2",
      source_id: "c1",
      target_id: "email1",
      type: "company_has_email",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an edge missing source_id", () => {
    const result = ApiEdgeSchema.safeParse({
      id: "e3",
      target_id: "c1",
      type: "company_has_email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an edge with an unknown type", () => {
    const result = ApiEdgeSchema.safeParse({
      id: "e4",
      source_id: "a",
      target_id: "b",
      type: "person_dislikes_company",
    });
    expect(result.success).toBe(false);
  });
});

describe("GraphSchemaSchema", () => {
  it("parses a graph with one node and one edge", () => {
    const result = GraphSchemaSchema.safeParse({
      root_id: "c1",
      nodes: [
        {
          id: "c1",
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
        },
      ],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a graph whose node has a malformed type", () => {
    const result = GraphSchemaSchema.safeParse({
      root_id: "c1",
      nodes: [{ id: "c1", type: "company" }],
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
