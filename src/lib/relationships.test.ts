import { describe, expect, it } from "vitest";
import { relationshipsForNode } from "@/lib/relationships";
import type { ApiEdge, CompanyNode, PersonNode, PlainEdge } from "@/types/api";

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

function ownsEdge(sourceId: string, targetId: string): ApiEdge {
  return {
    content_id: `edge-${sourceId}-${targetId}`,
    entry_date: "2020-01-01",
    id: `${sourceId}-${targetId}`,
    revision: revision(),
    role: "sócio-administrador",
    source_id: sourceId,
    target_id: targetId,
    type: "person_owns_company",
  };
}

function memberEdge(sourceId: string, targetId: string): PlainEdge {
  return {
    content_id: `edge-${sourceId}-${targetId}`,
    id: `${sourceId}-${targetId}`,
    revision: revision(),
    source_id: sourceId,
    target_id: targetId,
    type: "company_has_member",
  };
}

describe("relationshipsForNode", () => {
  it("labels an edge sourced from the given node as outgoing, counterpart is the target", () => {
    const marcos = person("cpf1", "Marcos Alberto Willemann");
    const bradesco = company("cnpj1", "Banco Bradesco S.A.");
    const nodeById = new Map<string, PersonNode | CompanyNode>([
      ["cpf1", marcos],
      ["cnpj1", bradesco],
    ]);
    const relationships = relationshipsForNode(
      "cpf1",
      [ownsEdge("cpf1", "cnpj1")],
      nodeById,
    );
    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({ direction: "outgoing" });
    expect(relationships[0]?.counterpart.id).toBe("cnpj1");
  });

  it("labels an edge targeting the given node as incoming, counterpart is the source", () => {
    const marcos = person("cpf1", "Marcos Alberto Willemann");
    const bradesco = company("cnpj1", "Banco Bradesco S.A.");
    const nodeById = new Map<string, PersonNode | CompanyNode>([
      ["cpf1", marcos],
      ["cnpj1", bradesco],
    ]);
    const relationships = relationshipsForNode(
      "cpf1",
      [memberEdge("cnpj1", "cpf1")],
      nodeById,
    );
    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({ direction: "incoming" });
    expect(relationships[0]?.counterpart.id).toBe("cnpj1");
  });

  it("never reports the queried node itself as its own counterpart", () => {
    const marcos = person("cpf1", "Marcos Alberto Willemann");
    const bradesco = company("cnpj1", "Banco Bradesco S.A.");
    const nodeById = new Map<string, PersonNode | CompanyNode>([
      ["cpf1", marcos],
      ["cnpj1", bradesco],
    ]);
    const relationships = relationshipsForNode(
      "cpf1",
      [ownsEdge("cpf1", "cnpj1"), memberEdge("cnpj1", "cpf1")],
      nodeById,
    );
    for (const relationship of relationships) {
      expect(relationship.counterpart.id).not.toBe("cpf1");
    }
  });

  it("keeps two distinct relationship types to the same counterpart as two separate entries, each with the correct direction", () => {
    const marcos = person("cpf1", "Marcos Alberto Willemann");
    const bradesco = company("cnpj1", "Banco Bradesco S.A.");
    const nodeById = new Map<string, PersonNode | CompanyNode>([
      ["cpf1", marcos],
      ["cnpj1", bradesco],
    ]);
    const relationships = relationshipsForNode(
      "cpf1",
      [memberEdge("cnpj1", "cpf1"), ownsEdge("cpf1", "cnpj1")],
      nodeById,
    );
    expect(relationships).toHaveLength(2);
    const incoming = relationships.find((r) => r.direction === "incoming");
    const outgoing = relationships.find((r) => r.direction === "outgoing");
    expect(incoming?.edge.type).toBe("company_has_member");
    expect(incoming?.counterpart.id).toBe("cnpj1");
    expect(outgoing?.edge.type).toBe("person_owns_company");
    expect(outgoing?.counterpart.id).toBe("cnpj1");
  });

  it("ignores an edge that touches neither endpoint of the queried node", () => {
    const marcos = person("cpf1", "Marcos Alberto Willemann");
    const bradesco = company("cnpj1", "Banco Bradesco S.A.");
    const other = company("cnpj2", "Outra Empresa LTDA");
    const nodeById = new Map<string, PersonNode | CompanyNode>([
      ["cpf1", marcos],
      ["cnpj1", bradesco],
      ["cnpj2", other],
    ]);
    const relationships = relationshipsForNode(
      "cpf1",
      [ownsEdge("cnpj2", "cnpj1")],
      nodeById,
    );
    expect(relationships).toHaveLength(0);
  });
});
