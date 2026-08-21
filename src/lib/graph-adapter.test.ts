import { describe, expect, it } from "vitest";
import { edgeKey, extractLabel, groupEdgesByPair } from "@/lib/graph-adapter";
import type {
  AddressNode,
  CompanyNode,
  OwnsCompanyEdge,
  PlainEdge,
  Revision,
} from "@/types/api";

const revision: Revision = {
  fetched_at: "2026-08-21T14:03:00Z",
  merged_at: null,
  provider: "kipflow",
};

describe("extractLabel", () => {
  it("prefers trade_name over legal_name over cnpj for a company", () => {
    const base: CompanyNode = {
      content_id: "c1",
      id: "c1",
      revision,
      type: "company",
      cnpj: "00000000000191",
      legal_name: "Acme Ltda",
      trade_name: "Acme",
      registration_status: null,
      registration_status_date: null,
      registration_status_reason: null,
      size_category: null,
      legal_nature: null,
      share_capital: null,
      activity_start_date: null,
      is_headquarters: null,
    };
    expect(extractLabel(base)).toBe("Acme");
    expect(extractLabel({ ...base, trade_name: null })).toBe("Acme Ltda");
    expect(extractLabel({ ...base, trade_name: null, legal_name: null })).toBe(
      "00000000000191",
    );
  });

  it("joins non-null address fields with a middle dot", () => {
    const address: AddressNode = {
      content_id: "a1",
      id: "a1",
      revision,
      type: "address",
      cep: "01310-100",
      city: "São Paulo",
      complement: null,
      neighborhood: "Bela Vista",
      number: "100",
      state: "SP",
      street: "Av. Paulista",
    };
    expect(extractLabel(address)).toBe(
      "01310-100 · Av. Paulista · Bela Vista · São Paulo/SP",
    );
    expect(extractLabel({ ...address, city: null, state: null })).toBe(
      "01310-100 · Av. Paulista · Bela Vista",
    );
  });

  it("truncates a long text_source at 60 chars with an ellipsis", () => {
    const text = "x".repeat(80);
    const label = extractLabel({
      content_id: "t1",
      id: "t1",
      revision,
      type: "text_source",
      text,
    });
    expect(label).toBe(`${"x".repeat(60)}…`);
  });

  it("returns short text_source unchanged", () => {
    const label = extractLabel({
      content_id: "t1",
      id: "t1",
      revision,
      type: "text_source",
      text: "short",
    });
    expect(label).toBe("short");
  });
});

describe("edgeKey", () => {
  it("joins source, target and type with a pipe", () => {
    const edge: PlainEdge = {
      content_id: "e1",
      id: "e1",
      revision,
      source_id: "n1",
      target_id: "n2",
      type: "company_has_email",
    };
    expect(edgeKey(edge)).toBe("n1|n2|company_has_email");
  });
});

describe("groupEdgesByPair", () => {
  it("collapses two relationships between the same node pair into one edge", () => {
    const owns: OwnsCompanyEdge = {
      content_id: "e1",
      id: "e1",
      revision,
      source_id: "person-1",
      target_id: "company-1",
      type: "person_owns_company",
      entry_date: "2020-01-01",
      role: "sócio",
    };
    const sharedAddress: PlainEdge = {
      content_id: "e2",
      id: "e2",
      revision,
      source_id: "company-1",
      target_id: "person-1",
      type: "company_located_at",
    };

    const result = groupEdgesByPair([owns, sharedAddress]);

    expect(result).toHaveLength(1);
    const [edge] = result;
    expect(edge?.data?.relationships).toHaveLength(2);
    expect(edge?.data?.relationships.map((r) => r.direction)).toEqual([
      "forward",
      "backward",
    ]);
  });

  it("keeps unrelated pairs as separate edges", () => {
    const a: PlainEdge = {
      content_id: "e1",
      id: "e1",
      revision,
      source_id: "n1",
      target_id: "n2",
      type: "company_has_email",
    };
    const b: PlainEdge = {
      content_id: "e2",
      id: "e2",
      revision,
      source_id: "n3",
      target_id: "n4",
      type: "company_has_phone",
    };
    expect(groupEdgesByPair([a, b])).toHaveLength(2);
  });
});
