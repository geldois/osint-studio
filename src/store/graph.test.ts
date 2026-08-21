import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGraphStore } from "@/store/graph";
import type { GraphSchema, PersonNode, Revision } from "@/types/api";

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

function graph(rootId: string, contentId: string): GraphSchema {
  return {
    content_id: contentId,
    root_id: rootId,
    revision,
    nodes: [person(rootId, "Alice")],
    edges: [],
  };
}

describe("useGraphStore", () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
  });

  it("receiveGraph stores the revision, orders it under its root, and selects it", () => {
    const schema = graph("p1", "g1");
    useGraphStore.getState().receiveGraph(schema);

    const state = useGraphStore.getState();
    expect(state.revisions["g1"]).toEqual(schema);
    expect(state.order["p1"]).toEqual(["g1"]);
    expect(state.selected).toEqual(["g1"]);
  });

  it("receiveGraph of the same revision twice leaves selected and order with one entry", () => {
    const schema = graph("p1", "g1");
    useGraphStore.getState().receiveGraph(schema);
    useGraphStore.getState().receiveGraph(schema);

    const state = useGraphStore.getState();
    expect(state.selected).toEqual(["g1"]);
    expect(state.order["p1"]).toEqual(["g1"]);
  });

  it("receiveHistory populates revisions and order without touching selected", () => {
    useGraphStore.getState().receiveGraph(graph("p1", "g1"));
    useGraphStore.getState().selectRevisions([]);

    useGraphStore
      .getState()
      .receiveHistory("p1", [graph("p1", "g1"), graph("p1", "g2")]);

    const state = useGraphStore.getState();
    expect(state.revisions["g2"]).toBeDefined();
    expect(state.order["p1"]).toEqual(["g1", "g2"]);
    expect(state.selected).toEqual([]);
  });

  it("receiveHistory of a root already partially present does not duplicate order", () => {
    useGraphStore.getState().receiveGraph(graph("p1", "g1"));
    useGraphStore
      .getState()
      .receiveHistory("p1", [graph("p1", "g1"), graph("p1", "g2")]);

    expect(useGraphStore.getState().order["p1"]).toEqual(["g1", "g2"]);
  });

  it("receiveHistory with an empty list clears that root's order without throwing", () => {
    useGraphStore.getState().receiveGraph(graph("p1", "g1"));
    useGraphStore.getState().receiveHistory("p1", []);

    expect(useGraphStore.getState().order["p1"]).toEqual([]);
  });

  it("selectRevisions([]) leaves selected empty — a valid, not-erroring state", () => {
    useGraphStore.getState().receiveGraph(graph("p1", "g1"));
    useGraphStore.getState().selectRevisions([]);

    expect(useGraphStore.getState().selected).toEqual([]);
  });

  it("selectRevisions ignores a content_id absent from revisions instead of throwing", () => {
    expect(() => {
      useGraphStore.getState().selectRevisions(["nonexistent"]);
    }).not.toThrow();
    expect(useGraphStore.getState().selected).toEqual(["nonexistent"]);
  });

  it("overrideNode(id, null) removes the key from nodeOverrides rather than storing null", () => {
    const alice = person("p1", "Alice");
    useGraphStore.getState().overrideNode("p1", alice);
    expect(useGraphStore.getState().nodeOverrides["p1"]).toEqual(alice);

    useGraphStore.getState().overrideNode("p1", null);
    expect(useGraphStore.getState().nodeOverrides).not.toHaveProperty("p1");
  });

  it("clearOverrides empties both node and edge overrides", () => {
    useGraphStore.getState().overrideNode("p1", person("p1", "Alice"));
    useGraphStore.getState().clearOverrides();

    const state = useGraphStore.getState();
    expect(state.nodeOverrides).toEqual({});
    expect(state.edgeOverrides).toEqual({});
  });

  it("reset clears revisions, order, selected and overrides", () => {
    useGraphStore.getState().receiveGraph(graph("p1", "g1"));
    useGraphStore.getState().overrideNode("p1", person("p1", "Alice"));

    useGraphStore.getState().reset();

    const state = useGraphStore.getState();
    expect(state.revisions).toEqual({});
    expect(state.order).toEqual({});
    expect(state.selected).toEqual([]);
    expect(state.nodeOverrides).toEqual({});
  });
});

function createSessionStorageDouble(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe("useGraphStore rehydration", () => {
  it("restores `selected` from sessionStorage and flips hasHydrated after reading it", async () => {
    const storageDouble = createSessionStorageDouble();
    vi.stubGlobal("sessionStorage", storageDouble);
    vi.resetModules();

    const { useGraphStore: freshStore } = await import("@/store/graph");
    freshStore.getState().receiveGraph(graph("p1", "g1"));
    await freshStore.persist.rehydrate();

    vi.resetModules();
    const { useGraphStore: reloadedStore } = await import("@/store/graph");
    await reloadedStore.persist.rehydrate();

    expect(reloadedStore.getState().hasHydrated).toBe(true);
    expect(reloadedStore.getState().selected).toEqual(["g1"]);

    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
