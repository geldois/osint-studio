import { describe, expect, it } from "vitest";
import { consumableSelection, nodesForTab, typedTabs } from "@/lib/table";
import type { ApiNode, CompanyNode, PersonNode, Revision } from "@/types/api";

const revision: Revision = {
  fetched_at: "2026-08-21T14:00:00Z",
  merged_at: null,
  provider: "kipflow",
};

function person(id: string, cpf: string): PersonNode {
  return {
    content_id: `${id}-c`,
    id,
    revision,
    type: "person",
    age_range: null,
    birthdate: null,
    cpf,
    name: null,
    registration_date: null,
    registration_status: null,
  };
}

function company(id: string, cnpj: string): CompanyNode {
  return {
    content_id: `${id}-c`,
    id,
    revision,
    type: "company",
    cnpj,
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
}

describe("typedTabs", () => {
  it("returns only the all tab, count 0, for an empty list", () => {
    expect(typedTabs([])).toEqual([{ count: 0, label: "Todos", nodeType: "all" }]);
  });

  it("returns all first plus one tab per present type, alphabetically by pt-BR label", () => {
    const nodes: ApiNode[] = [
      person("p1", "11144477735"),
      company("c1", "00000000000191"),
      person("p2", "22233344456"),
    ];
    const tabs = typedTabs(nodes);
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toEqual({ count: 3, label: "Todos", nodeType: "all" });
    expect(tabs.map((t) => t.nodeType).slice(1)).toEqual(["company", "person"]);
    expect(tabs.find((t) => t.nodeType === "person")?.count).toBe(2);
  });

  it("never creates a tab for a type with no nodes", () => {
    const tabs = typedTabs([person("p1", "11144477735")]);
    expect(tabs.some((t) => t.nodeType === "company")).toBe(false);
  });
});

describe("nodesForTab", () => {
  const nodes: ApiNode[] = [
    person("p1", "11144477735"),
    company("c1", "00000000000191"),
  ];

  it("returns every node for the all tab", () => {
    expect(nodesForTab(nodes, "all")).toEqual(nodes);
  });

  it("returns only nodes of the requested type", () => {
    expect(nodesForTab(nodes, "person")).toEqual([nodes[0]]);
  });
});

describe("consumableSelection", () => {
  it("splits a selection of two full CPFs, one masked, and one company", () => {
    const nodes: ApiNode[] = [
      person("p1", "11144477735"),
      person("p2", "22233344456"),
      person("p3", "***444777**"),
      company("c1", "00000000000191"),
    ];
    const result = consumableSelection(nodes, new Set(["p1", "p2", "p3", "c1"]));
    expect(result.cpfs.sort()).toEqual(["11144477735", "22233344456"]);
    expect(result.skippedIds.sort()).toEqual(["c1", "p3"]);
  });

  it("deduplicates the same CPF shared by two distinct nodes", () => {
    const nodes: ApiNode[] = [person("p1", "11144477735"), person("p2", "11144477735")];
    const result = consumableSelection(nodes, new Set(["p1", "p2"]));
    expect(result.cpfs).toEqual(["11144477735"]);
  });

  it("returns two empty arrays for an empty selection, without throwing", () => {
    const nodes: ApiNode[] = [person("p1", "11144477735")];
    expect(() => consumableSelection(nodes, new Set())).not.toThrow();
    expect(consumableSelection(nodes, new Set())).toEqual({ cpfs: [], skippedIds: [] });
  });

  it("skips a selected id no longer present in the node list instead of throwing", () => {
    const nodes: ApiNode[] = [person("p1", "11144477735")];
    expect(() => consumableSelection(nodes, new Set(["gone"]))).not.toThrow();
    const result = consumableSelection(nodes, new Set(["gone"]));
    expect(result.skippedIds).toEqual(["gone"]);
  });
});
