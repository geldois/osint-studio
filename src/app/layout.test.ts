import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf-8");

describe("root layout height", () => {
  it("never uses a min-height utility on <html>/<body>", () => {
    expect(layoutSource).not.toMatch(/\bmin-h-/);
  });

  it("keeps a fixed dynamic-viewport height on both <html> and <body>, the base every h-full descendant needs", () => {
    expect([...layoutSource.matchAll(/\bh-dvh\b/g)]).toHaveLength(2);
  });
});
