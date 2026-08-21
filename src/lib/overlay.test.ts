import { describe, expect, it } from "vitest";
import { formatFetchedAt, overlayRevisions, pruneSelection } from "@/lib/overlay";
import type { ApiEdge, ApiNode, GraphSchema, PersonNode, PlainEdge } from "@/types/api";

function revision(fetchedAt: string) {
  return { fetched_at: fetchedAt, merged_at: null, provider: "kipflow" };
}

function person(
  id: string,
  contentId: string,
  fetchedAt: string,
  name: string | null = null,
): PersonNode {
  return {
    content_id: contentId,
    id,
    revision: revision(fetchedAt),
    type: "person",
    age_range: null,
    birthdate: null,
    cpf: id,
    name,
    registration_date: null,
    registration_status: null,
  };
}

function ownsEdge(
  source: string,
  target: string,
  contentId: string,
  fetchedAt: string,
): PlainEdge {
  return {
    content_id: contentId,
    id: `${source}-${target}`,
    revision: revision(fetchedAt),
    source_id: source,
    target_id: target,
    type: "company_has_member",
  };
}

function graph(
  rootId: string,
  contentId: string,
  nodes: ApiNode[],
  edges: ApiEdge[],
): GraphSchema {
  return {
    content_id: contentId,
    root_id: rootId,
    revision: revision(nodes[0]?.revision.fetched_at ?? "2026-08-21T14:00:00Z"),
    nodes,
    edges,
  };
}

describe("overlayRevisions", () => {
  it("returns empty output for no revisions", () => {
    const result = overlayRevisions([], {}, {});
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.roots.size).toBe(0);
    expect(result.conflicts).toEqual({ edges: {}, nodes: {} });
  });

  it("returns exactly the nodes and edges of a single revision, no conflicts", () => {
    const p1 = person("p1", "c1", "2026-08-21T14:00:00Z", "Alice");
    const result = overlayRevisions([graph("p1", "g1", [p1], [])], {}, {});
    expect(result.nodes).toEqual([p1]);
    expect(result.conflicts.nodes).toEqual({});
  });

  it("collapses a node of identical content_id across two revisions, no conflict", () => {
    const p1 = person("p1", "c1", "2026-08-21T14:00:00Z", "Alice");
    const result = overlayRevisions(
      [graph("p1", "g1", [p1], []), graph("p1", "g2", [p1], [])],
      {},
      {},
    );
    expect(result.nodes).toEqual([p1]);
    expect(result.conflicts.nodes).toEqual({});
  });

  it("picks the newest fetched_at among distinct content_ids and lists both in conflicts", () => {
    const older = person("p1", "c1", "2026-08-21T14:00:00Z", "Alice");
    const newer = person("p1", "c2", "2026-08-21T15:00:00Z", "Alice Silva");
    const result = overlayRevisions(
      [graph("p1", "g1", [older], []), graph("p1", "g2", [newer], [])],
      {},
      {},
    );
    expect(result.nodes).toEqual([newer]);
    expect(result.conflicts.nodes["p1"]).toEqual([older, newer]);
  });

  it("lists all three distinct content_ids for a node seen three times, not just two", () => {
    const a = person("p1", "c1", "2026-08-21T14:00:00Z");
    const b = person("p1", "c2", "2026-08-21T15:00:00Z");
    const c = person("p1", "c3", "2026-08-21T16:00:00Z");
    const result = overlayRevisions(
      [
        graph("p1", "g1", [a], []),
        graph("p1", "g2", [b], []),
        graph("p1", "g3", [c], []),
      ],
      {},
      {},
    );
    expect(result.conflicts.nodes["p1"]).toEqual([a, b, c]);
    expect(result.nodes).toEqual([c]);
  });

  it("breaks a fetched_at tie by the lexicographically greater content_id, deterministically", () => {
    const a = person("p1", "c-aaa", "2026-08-21T14:00:00Z");
    const b = person("p1", "c-zzz", "2026-08-21T14:00:00Z");
    const revisions = [graph("p1", "g1", [a], []), graph("p1", "g2", [b], [])];

    const first = overlayRevisions(revisions, {}, {});
    const second = overlayRevisions(revisions, {}, {});
    expect(first.nodes).toEqual([b]);
    expect(second.nodes).toEqual([b]);
  });

  it("an explicit nodeOverride wins even when its fetched_at is the oldest candidate", () => {
    const older = person("p1", "c1", "2026-08-21T14:00:00Z", "Alice");
    const newer = person("p1", "c2", "2026-08-21T15:00:00Z", "Alice Silva");
    const result = overlayRevisions(
      [graph("p1", "g1", [older], []), graph("p1", "g2", [newer], [])],
      { p1: older },
      {},
    );
    expect(result.nodes).toEqual([older]);
  });

  it("a nodeOverride whose id has no candidate in any selected revision injects nothing", () => {
    const p1 = person("p1", "c1", "2026-08-21T14:00:00Z");
    const ghost = person("ghost", "c-ghost", "2026-08-21T14:00:00Z");
    const result = overlayRevisions([graph("p1", "g1", [p1], [])], { ghost }, {});
    expect(result.nodes).toEqual([p1]);
  });

  it("collects the set of root_ids without repetition", () => {
    const p1 = person("p1", "c1", "2026-08-21T14:00:00Z");
    const p2 = person("p2", "c2", "2026-08-21T14:00:00Z");
    const result = overlayRevisions(
      [
        graph("p1", "g1", [p1], []),
        graph("p1", "g2", [p1], []),
        graph("p2", "g3", [p2], []),
      ],
      {},
      {},
    );
    expect(result.roots).toEqual(new Set(["p1", "p2"]));
  });

  it("resolves edges by the same content_id/fetched_at rule as nodes, keyed by edgeKey", () => {
    const older = ownsEdge("c1", "p1", "e-old", "2026-08-21T14:00:00Z");
    const newer = ownsEdge("c1", "p1", "e-new", "2026-08-21T15:00:00Z");
    const p1 = person("p1", "cp1", "2026-08-21T14:00:00Z");
    const result = overlayRevisions(
      [graph("c1", "g1", [p1], [older]), graph("c1", "g2", [p1], [newer])],
      {},
      {},
    );
    expect(result.edges).toEqual([newer]);
    expect(Object.keys(result.conflicts.edges)).toHaveLength(1);
  });
});

describe("formatFetchedAt", () => {
  it("formats an ISO UTC timestamp as pt-BR date and time, deterministically", () => {
    const first = formatFetchedAt("2026-08-21T14:03:00Z");
    const second = formatFetchedAt("2026-08-21T14:03:00Z");
    expect(first).toBe(second);
    expect(first).toMatch(/2026|26/);
  });

  it("drops sub-second precision from the short-style output", () => {
    const result = formatFetchedAt("2026-08-21T14:03:00.987Z");
    expect(result).not.toContain(".");
  });
});

describe("pruneSelection", () => {
  it("keeps only content_ids the server still has", () => {
    const result = pruneSelection(["c1", "c2", "c3"], new Set(["c1", "c3"]));
    expect(result).toEqual(["c1", "c3"]);
  });

  it("returns an empty selection when the server has none of it (engine restarted)", () => {
    const result = pruneSelection(["c1", "c2"], new Set());
    expect(result).toEqual([]);
  });

  it("leaves a selection untouched when every id is still available", () => {
    const result = pruneSelection(["c1", "c2"], new Set(["c1", "c2"]));
    expect(result).toEqual(["c1", "c2"]);
  });
});
