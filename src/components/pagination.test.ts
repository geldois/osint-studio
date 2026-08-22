import { describe, expect, it } from "vitest";
import { paginationWindow } from "@/components/pagination";

describe("paginationWindow", () => {
  it("returns every page when pageCount fits within the window", () => {
    expect(paginationWindow(1, 3)).toEqual([1, 2, 3]);
    expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("centers the window on the current page when there's room on both sides", () => {
    expect(paginationWindow(5, 10)).toEqual([3, 4, 5, 6, 7]);
  });

  it("clamps the window to the start when the current page is near page 1", () => {
    expect(paginationWindow(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationWindow(2, 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it("clamps the window to the end when the current page is near the last page", () => {
    expect(paginationWindow(10, 10)).toEqual([6, 7, 8, 9, 10]);
    expect(paginationWindow(9, 10)).toEqual([6, 7, 8, 9, 10]);
  });

  it("always returns a window of the requested size when there are enough pages", () => {
    for (let page = 1; page <= 10; page++) {
      expect(paginationWindow(page, 10)).toHaveLength(5);
    }
  });
});
