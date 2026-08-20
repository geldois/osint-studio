import { describe, expect, it } from "vitest";
import {
  ApiEdgeSchema,
  ApiNodeSchema,
  GraphSchemaSchema,
  TokenResponseSchema,
} from "@/lib/api-schemas";

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
    const person = {
      id: "p1",
      type: "person",
      age_range: null,
      cpf: "00000000000",
      name: "Ana",
      registration_date: null,
      registration_status: null,
    };
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
    expect(ApiNodeSchema.safeParse(person).success).toBe(true);
    expect(ApiNodeSchema.safeParse(address).success).toBe(true);
  });

  it("rejects a node missing a required field for its type", () => {
    const result = ApiNodeSchema.safeParse({
      id: "p1",
      type: "person",
      age_range: null,
      name: "Ana",
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
