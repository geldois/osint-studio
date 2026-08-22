import { describe, expect, it } from "vitest";
import {
  consumableSelection,
  itemsForTypeFilter,
  itemsMatchingSelection,
  nodesForTypeFilter,
  typeFilterOptions,
  typeFilterOptionsFor,
} from "@/lib/table";
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

describe("typeFilterOptions", () => {
  it("returns an empty list for an empty list of nodes", () => {
    expect(typeFilterOptions([])).toEqual([]);
  });

  it("returns one option per present type, alphabetically by pt-BR label", () => {
    const nodes: ApiNode[] = [
      person("p1", "11144477735"),
      company("c1", "00000000000191"),
      person("p2", "22233344456"),
    ];
    const options = typeFilterOptions(nodes);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.value)).toEqual(["company", "person"]);
    expect(options.find((o) => o.value === "person")?.count).toBe(2);
  });

  it("never creates an option for a type with no nodes", () => {
    const options = typeFilterOptions([person("p1", "11144477735")]);
    expect(options.some((o) => o.value === "company")).toBe(false);
  });
});

describe("nodesForTypeFilter", () => {
  const nodes: ApiNode[] = [
    person("p1", "11144477735"),
    company("c1", "00000000000191"),
  ];

  it("returns every node when nothing is selected", () => {
    expect(nodesForTypeFilter(nodes, [])).toEqual(nodes);
  });

  it("returns every node when every present type is selected", () => {
    expect(nodesForTypeFilter(nodes, ["person", "company"])).toEqual(nodes);
  });

  it("returns only nodes of the selected types", () => {
    expect(nodesForTypeFilter(nodes, ["person"])).toEqual([nodes[0]]);
  });
});

describe("typeFilterOptionsFor", () => {
  interface Relationship {
    counterpartType: ApiNode["type"];
  }
  const typeOf = (r: Relationship) => r.counterpartType;

  it("groups and counts by an arbitrary type accessor, not just node.type", () => {
    const relationships: Relationship[] = [
      { counterpartType: "person" },
      { counterpartType: "company" },
      { counterpartType: "person" },
    ];
    const options = typeFilterOptionsFor(relationships, typeOf);
    expect(options.find((o) => o.value === "person")?.count).toBe(2);
    expect(options.find((o) => o.value === "company")?.count).toBe(1);
  });

  it("returns an empty list for an empty collection", () => {
    expect(typeFilterOptionsFor<Relationship>([], typeOf)).toEqual([]);
  });
});

describe("itemsForTypeFilter", () => {
  interface Relationship {
    counterpartType: ApiNode["type"];
  }
  const typeOf = (r: Relationship) => r.counterpartType;
  const relationships: Relationship[] = [
    { counterpartType: "person" },
    { counterpartType: "company" },
  ];

  it("returns every item when nothing is selected", () => {
    expect(itemsForTypeFilter(relationships, typeOf, [])).toEqual(relationships);
  });

  it("returns every item when every present type is selected", () => {
    expect(itemsForTypeFilter(relationships, typeOf, ["person", "company"])).toEqual(
      relationships,
    );
  });

  it("returns only items of the selected types", () => {
    expect(itemsForTypeFilter(relationships, typeOf, ["company"])).toEqual([
      relationships[1],
    ]);
  });

  it("returns an empty list when the selected type is absent from the collection", () => {
    expect(itemsForTypeFilter(relationships, typeOf, ["address"])).toEqual([]);
  });
});

describe("itemsMatchingSelection", () => {
  const items = [
    { id: "a", direction: "outgoing" as const },
    { id: "b", direction: "incoming" as const },
    { id: "c", direction: "outgoing" as const },
  ];
  const directionOf = (item: (typeof items)[number]) => item.direction;

  it("returns every item when nothing is selected", () => {
    expect(itemsMatchingSelection(items, directionOf, [])).toEqual(items);
  });

  it("returns only items matching the selected values", () => {
    expect(itemsMatchingSelection(items, directionOf, ["incoming"])).toEqual([
      items[1],
    ]);
  });

  it("returns every item when every present value is selected", () => {
    expect(
      itemsMatchingSelection(items, directionOf, ["outgoing", "incoming"]),
    ).toEqual(items);
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
