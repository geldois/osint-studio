import { describe, expect, it } from "vitest";
import { docsNudgeText, isRelevantChange } from "./_docs-nudge";

describe("isRelevantChange", () => {
  it("excludes files under docs/", () => {
    expect(isRelevantChange("docs/architecture/tooling.md")).toBe(false);
  });

  it("excludes generated and vendor prefixes", () => {
    expect(isRelevantChange("node_modules/foo/index.js")).toBe(false);
    expect(isRelevantChange(".next/build/x.json")).toBe(false);
    expect(isRelevantChange(".cache/eslint/foo")).toBe(false);
    expect(isRelevantChange("build/out.js")).toBe(false);
    expect(isRelevantChange("coverage/index.html")).toBe(false);
  });

  it("excludes named root docs", () => {
    expect(isRelevantChange("README.md")).toBe(false);
    expect(isRelevantChange("TO-DO.md")).toBe(false);
    expect(isRelevantChange("CLAUDE.md")).toBe(false);
    expect(isRelevantChange("CONTEXT.md")).toBe(false);
  });

  it("includes the changelog and the lockfile", () => {
    expect(isRelevantChange("CHANGELOG.md")).toBe(true);
    expect(isRelevantChange("pnpm-lock.yaml")).toBe(true);
  });

  it("includes a config file at repo root", () => {
    expect(isRelevantChange("dprint.json")).toBe(true);
    expect(isRelevantChange("package.json")).toBe(true);
    expect(isRelevantChange("vitest.config.mts")).toBe(true);
  });

  it("includes application source", () => {
    expect(isRelevantChange("src/lib/foo.ts")).toBe(true);
  });
});

describe("docsNudgeText", () => {
  it("always names the whole docs surface", () => {
    const text = docsNudgeText(null);
    expect(text).toContain("every docs/architecture/*.md");
    expect(text).toContain("README.md, CONTEXT.md, and TO-DO.md");
  });

  it("names the sibling repo only when its path is given", () => {
    expect(docsNudgeText(null)).not.toContain("osint-engine");
    expect(docsNudgeText("/home/x/osint-engine")).toContain(
      "osint-engine at /home/x/osint-engine",
    );
  });
});
