import type { Edge } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  documentExistsInCatalog,
  type EntityNode,
  edgeKey,
  extractLabel,
  groupEdgesByPair,
  isEdgeHighlighted,
  isNodeHighlighted,
  layoutGraph,
  nodeToRows,
  projectGraph,
} from "@/lib/graph-adapter";
import type {
  AddressNode,
  CompanyNode,
  GraphCatalogEntry,
  OwnsCompanyEdge,
  PersonNode,
  PlainEdge,
  Revision,
} from "@/types/api";

function testNode(id: string, isRoot = false): EntityNode {
  return {
    id,
    position: { x: 0, y: 0 },
    measured: { width: 208, height: 64 },
    data: {
      label: id,
      nodeType: "company",
      isRoot,
      cnpj: null,
      cpf: null,
      rows: [],
      conflictCount: 0,
      isOverridden: false,
      edgeGroupIds: [],
      neighborNodeIds: [],
      relationshipEdgeIds: [],
    },
    type: "entity",
  };
}

function testEdge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function positionOf(nodes: EntityNode[], id: string): { x: number; y: number } {
  const node = nodes.find((n) => n.id === id);
  if (node === undefined) {
    throw new Error(`node ${id} missing from layout output`);
  }
  return node.position;
}

function rightEdgeOf(nodes: EntityNode[], id: string): number {
  const node = nodes.find((n) => n.id === id);
  if (node === undefined) {
    throw new Error(`node ${id} missing from layout output`);
  }
  return node.position.x + (node.measured?.width ?? 0);
}

const revision: Revision = {
  fetched_at: "2026-08-21T14:03:00Z",
  merged_at: null,
  provider: "kipflow",
};

describe("extractLabel", () => {
  it("prefers legal_name over trade_name over cnpj for a company", () => {
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
    expect(extractLabel(base)).toBe("Acme Ltda");
    expect(extractLabel({ ...base, legal_name: null })).toBe("Acme");
    expect(extractLabel({ ...base, trade_name: null, legal_name: null })).toBe(
      "00000000000191",
    );
  });

  it("falls back past an empty legal_name or trade_name the same as a null one", () => {
    const base: CompanyNode = {
      content_id: "c1",
      id: "c1",
      revision,
      type: "company",
      cnpj: "00000000000191",
      legal_name: "",
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
    expect(extractLabel({ ...base, trade_name: "" })).toBe("00000000000191");
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

describe("documentExistsInCatalog", () => {
  function catalogEntry(root: CompanyNode | PersonNode): GraphCatalogEntry {
    return {
      first_fetched_at: "2026-08-21T14:03:00Z",
      last_fetched_at: "2026-08-21T14:03:00Z",
      providers: ["brasilapi"],
      revision_count: 1,
      root,
    };
  }

  const company: CompanyNode = {
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

  const person: PersonNode = {
    content_id: "p1",
    id: "p1",
    revision,
    type: "person",
    age_range: null,
    birthdate: null,
    cpf: "11144477735",
    name: "Fulano",
    registration_date: null,
    registration_status: null,
  };

  it("matches a CNPJ against a company root regardless of mask characters", () => {
    const entries = [catalogEntry(company)];
    expect(documentExistsInCatalog("00.000.000/0001-91", entries)).toBe(true);
    expect(documentExistsInCatalog("00000000000192", entries)).toBe(false);
  });

  it("matches a CPF against an unmasked person root", () => {
    const entries = [catalogEntry(person)];
    expect(documentExistsInCatalog("111.444.777-35", entries)).toBe(true);
    expect(documentExistsInCatalog("11144477736", entries)).toBe(false);
  });

  it("never matches a masked person root, since the real CPF is unknown", () => {
    const entries = [catalogEntry({ ...person, cpf: "***444777**" })];
    expect(documentExistsInCatalog("11144477735", entries)).toBe(false);
  });

  it("is false for an empty catalog", () => {
    expect(documentExistsInCatalog("00000000000191", [])).toBe(false);
  });
});

describe("nodeToRows", () => {
  it("exposes every attribute the API sends for a person, not just name/cpf/age_range", () => {
    const person: PersonNode = {
      content_id: "p1",
      id: "p1",
      revision,
      type: "person",
      name: "Fulano de Tal",
      cpf: "11144477735",
      age_range: "31 a 40 anos",
      birthdate: "1990-01-01",
      registration_status: "REGULAR",
      registration_date: "2010-05-20",
    };
    const rows = nodeToRows(person);
    expect(rows).toContainEqual({ key: "data de nascimento", value: "1990-01-01" });
    expect(rows).toContainEqual({ key: "situação cadastral", value: "REGULAR" });
    expect(rows).toContainEqual({ key: "data de cadastro", value: "2010-05-20" });
  });

  it("falls back to an em dash for null person fields instead of dropping the row", () => {
    const person: PersonNode = {
      content_id: "p1",
      id: "p1",
      revision,
      type: "person",
      name: null,
      cpf: "11144477735",
      age_range: null,
      birthdate: null,
      registration_status: null,
      registration_date: null,
    };
    const rows = nodeToRows(person);
    expect(rows).toContainEqual({ key: "data de nascimento", value: "—" });
    expect(rows).toContainEqual({ key: "situação cadastral", value: "—" });
    expect(rows).toContainEqual({ key: "data de cadastro", value: "—" });
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

describe("isNodeHighlighted", () => {
  const base = {
    edgeGroupIds: ["group-1"],
    hoveredEdgeGroupId: null,
    hoveredNodeId: null,
    neighborNodeIds: ["neighbor-1"],
    nodeId: "self",
    relationshipEdgeIds: ["edge-1"],
    selectedEdgeId: null,
    selectedNodeId: null,
  };

  it("stays highlighted when a neighbor is selected, with no hover involved", () => {
    expect(isNodeHighlighted({ ...base, selectedNodeId: "neighbor-1" })).toBe(true);
  });

  it("is not highlighted when a non-neighbor is selected", () => {
    expect(isNodeHighlighted({ ...base, selectedNodeId: "someone-else" })).toBe(false);
  });

  it("highlights both endpoints when the relationship touching them is selected", () => {
    expect(isNodeHighlighted({ ...base, selectedEdgeId: "edge-1" })).toBe(true);
  });

  it("stays highlighted while hovering, independent of selection", () => {
    expect(isNodeHighlighted({ ...base, hoveredNodeId: "neighbor-1" })).toBe(true);
  });

  it("is not highlighted with no hover and no relevant selection", () => {
    expect(isNodeHighlighted(base)).toBe(false);
  });
});

describe("isEdgeHighlighted", () => {
  const base = {
    edgeGroupId: "group-1",
    hoveredEdgeGroupId: null,
    hoveredNodeId: null,
    selectedNodeId: null,
    source: "n1",
    target: "n2",
  };

  it("stays highlighted when either endpoint is selected, with no hover involved", () => {
    expect(isEdgeHighlighted({ ...base, selectedNodeId: "n1" })).toBe(true);
    expect(isEdgeHighlighted({ ...base, selectedNodeId: "n2" })).toBe(true);
  });

  it("is not highlighted when a node outside the pair is selected", () => {
    expect(isEdgeHighlighted({ ...base, selectedNodeId: "n3" })).toBe(false);
  });

  it("stays highlighted while hovering an endpoint, independent of selection", () => {
    expect(isEdgeHighlighted({ ...base, hoveredNodeId: "n1" })).toBe(true);
  });
});

describe("projectGraph — relationshipEdgeIds", () => {
  it("lets a node resolve which of its own relationships a selected raw edge belongs to", () => {
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
    const person: PersonNode = {
      age_range: null,
      birthdate: null,
      content_id: "cp1",
      cpf: "person-1",
      id: "person-1",
      name: "Fulano",
      registration_date: null,
      registration_status: null,
      revision,
      type: "person",
    };
    const company: CompanyNode = {
      activity_start_date: null,
      cnpj: "company-1",
      content_id: "cc1",
      id: "company-1",
      is_headquarters: null,
      legal_name: "Acme LTDA",
      legal_nature: null,
      registration_status: null,
      registration_status_date: null,
      registration_status_reason: null,
      revision,
      share_capital: null,
      size_category: null,
      trade_name: null,
      type: "company",
    };

    const { nodes } = projectGraph([person, company], [owns], new Set(), {}, new Set());
    const selectedEdgeId = edgeKey(owns);
    for (const node of nodes) {
      expect(node.data.relationshipEdgeIds).toContain(selectedEdgeId);
    }
  });
});

describe("layoutGraph", () => {
  it("spreads a wide star across multiple rings instead of one huge circle", () => {
    const root = testNode("root", true);
    const children = Array.from({ length: 111 }, (_, i) => testNode(`c${String(i)}`));
    const nodes = [root, ...children];
    const edges = children.map((child) => testEdge("root", child.id));

    const laidOut = layoutGraph(nodes, edges);

    const rootPosition = positionOf(laidOut, "root");
    const radii = children.map((child) =>
      distance(rootPosition, positionOf(laidOut, child.id)),
    );
    const maxRadius = Math.max(...radii);
    const uniqueRings = new Set(radii.map((r) => Math.round(r / 10) * 10)).size;

    expect(uniqueRings).toBeGreaterThan(1);
    expect(maxRadius).toBeLessThan(2000);
  });

  it("keeps two disconnected components from overlapping", () => {
    const smallRoot = testNode("small-root", true);
    const smallChild = testNode("small-child");
    const bigRoot = testNode("big-root", true);
    const bigChildren = Array.from({ length: 40 }, (_, i) =>
      testNode(`big-c${String(i)}`),
    );

    const nodes = [smallRoot, smallChild, bigRoot, ...bigChildren];
    const edges = [
      testEdge("small-root", "small-child"),
      ...bigChildren.map((child) => testEdge("big-root", child.id)),
    ];

    const laidOut = layoutGraph(nodes, edges);

    const smallRightEdge = Math.max(
      rightEdgeOf(laidOut, "small-root"),
      rightEdgeOf(laidOut, "small-child"),
    );
    const bigLeftEdge = Math.min(
      ...["big-root", ...bigChildren.map((c) => c.id)].map(
        (id) => positionOf(laidOut, id).x,
      ),
    );

    expect(smallRightEdge).toBeLessThanOrEqual(bigLeftEdge);
  });
});
