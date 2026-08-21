import { beforeEach, describe, expect, it } from "vitest";
import { useTableSelectionStore } from "@/store/table-selection";

describe("useTableSelectionStore", () => {
  beforeEach(() => {
    useTableSelectionStore.getState().clear();
  });

  it("setMany(ids, true) followed by setMany(ids, false) leaves selectedIds as it started", () => {
    useTableSelectionStore.getState().setMany(["p1", "p2"], true);
    useTableSelectionStore.getState().setMany(["p1", "p2"], false);

    expect(useTableSelectionStore.getState().selectedIds).toEqual(new Set());
  });

  it("setMany([]) is a no-op", () => {
    useTableSelectionStore.getState().setMany(["p1"], true);
    useTableSelectionStore.getState().setMany([], true);

    expect(useTableSelectionStore.getState().selectedIds).toEqual(new Set(["p1"]));
  });

  it("setMany with already-selected ids does not duplicate", () => {
    useTableSelectionStore.getState().setMany(["p1"], true);
    useTableSelectionStore.getState().setMany(["p1", "p2"], true);

    expect(useTableSelectionStore.getState().selectedIds).toEqual(
      new Set(["p1", "p2"]),
    );
  });

  it("toggling the same id twice leaves selectedIds as it started", () => {
    useTableSelectionStore.getState().toggle("p1");
    useTableSelectionStore.getState().toggle("p1");

    expect(useTableSelectionStore.getState().selectedIds).toEqual(new Set());
  });

  it("survives switching context: selecting, reading elsewhere, and reading again", () => {
    useTableSelectionStore.getState().toggle("p1");
    useTableSelectionStore.getState().toggle("p2");

    expect(useTableSelectionStore.getState().selectedIds).toEqual(
      new Set(["p1", "p2"]),
    );
  });

  it("clear empties the selection", () => {
    useTableSelectionStore.getState().setMany(["p1", "p2"], true);
    useTableSelectionStore.getState().clear();

    expect(useTableSelectionStore.getState().selectedIds).toEqual(new Set());
  });
});
