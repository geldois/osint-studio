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

  it("excludes named root docs and the lockfile", () => {
    expect(isRelevantChange("README.md")).toBe(false);
    expect(isRelevantChange("TO-DO.md")).toBe(false);
    expect(isRelevantChange("CLAUDE.md")).toBe(false);
    expect(isRelevantChange("CONTEXT.md")).toBe(false);
    expect(isRelevantChange("CHANGELOG.md")).toBe(false);
    expect(isRelevantChange("pnpm-lock.yaml")).toBe(false);
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
  it("lists existing areas when given any", () => {
    const text = docsNudgeText(["harness", "tooling", "ui"]);
    expect(text).toContain("(existing: harness, tooling, ui)");
  });

  it("omits the parenthetical when there are no areas", () => {
    const text = docsNudgeText([]);
    expect(text).not.toContain("(existing:");
  });
});
