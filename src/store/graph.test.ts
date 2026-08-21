import { beforeEach, describe, expect, it } from "vitest";
import { useGraphStore } from "@/store/graph";
import type { GraphSchema, PersonNode, PlainEdge, Revision } from "@/types/api";

const revision: Revision = {
  fetched_at: "2026-08-21T14:03:00Z",
  merged_at: null,
  provider: "kipflow",
};

const person = (id: string, name: string): PersonNode => ({
  content_id: `${id}-${name}`,
  id,
  revision,
  type: "person",
  age_range: null,
  birthdate: null,
  cpf: id,
  name,
  registration_date: null,
  registration_status: null,
});

const ownsEdge = (source: string, target: string): PlainEdge => ({
  content_id: `${source}-${target}`,
  id: `${source}-${target}`,
  revision,
  source_id: source,
  target_id: target,
  type: "company_has_member",
});

describe("useGraphStore.mergeGraph", () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
  });

  it("adds new nodes, edges and the root id", () => {
    const schema: GraphSchema = {
      content_id: "g1",
      revision,
      root_id: "p1",
      nodes: [person("p1", "Alice")],
      edges: [],
    };

    useGraphStore.getState().mergeGraph(schema);

    const state = useGraphStore.getState();
    expect(state.rawNodes).toEqual([person("p1", "Alice")]);
    expect(state.roots.has("p1")).toBe(true);
  });

  it("re-merging the same schema adds no duplicate nodes or edges", () => {
    const schema: GraphSchema = {
      content_id: "g1",
      revision,
      root_id: "p1",
      nodes: [person("p1", "Alice"), person("p2", "Bob")],
      edges: [ownsEdge("p1", "p2")],
    };

    useGraphStore.getState().mergeGraph(schema);
    useGraphStore.getState().mergeGraph(schema);

    const state = useGraphStore.getState();
    expect(state.rawNodes).toHaveLength(2);
    expect(state.rawEdges).toHaveLength(1);
  });

  it("merges overlapping schemas into a union and accumulates roots", () => {
    const first: GraphSchema = {
      content_id: "g1",
      revision,
      root_id: "p1",
      nodes: [person("p1", "Alice"), person("p2", "Bob")],
      edges: [ownsEdge("p1", "p2")],
    };
    const second: GraphSchema = {
      content_id: "g2",
      revision,
      root_id: "p2",
      nodes: [person("p2", "Bob"), person("p3", "Carol")],
      edges: [ownsEdge("p2", "p3")],
    };

    useGraphStore.getState().mergeGraph(first);
    useGraphStore.getState().mergeGraph(second);

    const state = useGraphStore.getState();
    expect(state.rawNodes.map((n) => n.id).sort()).toEqual(["p1", "p2", "p3"]);
    expect(state.rawEdges).toHaveLength(2);
    expect(state.roots).toEqual(new Set(["p1", "p2"]));
  });

  it("a newer observation of an existing node replaces the older one", () => {
    useGraphStore.getState().mergeGraph({
      content_id: "g1",
      revision,
      root_id: "p1",
      nodes: [person("p1", "Alice")],
      edges: [],
    });
    useGraphStore.getState().mergeGraph({
      content_id: "g1",
      revision,
      root_id: "p1",
      nodes: [person("p1", "Alice Updated")],
      edges: [],
    });

    const state = useGraphStore.getState();
    expect(state.rawNodes).toHaveLength(1);
    expect(state.rawNodes[0]?.type === "person" && state.rawNodes[0].name).toBe(
      "Alice Updated",
    );
  });
});
