import { afterEach, describe, expect, it, vi } from "vitest";
import { hasHorizontalOverflow, overflowingElements } from "@/lib/viewport";

function element(tag: string, right: number): Element {
  return {
    tagName: tag.toUpperCase(),
    id: "",
    className: "",
    getBoundingClientRect: () => ({ right }) as DOMRect,
  } as unknown as Element;
}

function stubDom(elements: Element[], scrollWidth: number, innerWidth: number): void {
  vi.stubGlobal("window", { innerWidth });
  vi.stubGlobal("document", {
    documentElement: { scrollWidth },
    querySelectorAll: () => elements,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hasHorizontalOverflow", () => {
  it("is false when scrollWidth matches innerWidth", () => {
    stubDom([], 375, 375);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it("is true when scrollWidth exceeds innerWidth", () => {
    stubDom([], 400, 375);
    expect(hasHorizontalOverflow()).toBe(true);
  });
});

describe("overflowingElements", () => {
  it("returns [] when nothing overflows", () => {
    stubDom([element("div", 300)], 375, 375);
    expect(overflowingElements()).toEqual([]);
  });

  it("does not count an element exactly at the boundary — the off-by-one that would flood the audit", () => {
    stubDom([element("div", 375)], 375, 375);
    expect(overflowingElements()).toEqual([]);
  });

  it("counts an element whose right edge is fractionally past the boundary", () => {
    stubDom([element("div", 375.5)], 400, 375);
    expect(overflowingElements()).toEqual(["div"]);
  });
});
