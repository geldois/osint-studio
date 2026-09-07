import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  changedPaths,
  docsNudgeText,
  isRelevantChange,
  mtimeOf,
  parseMtimes,
  pathMtimes,
  porcelainPaths,
  serializeMtimes,
} from "./_docs-nudge";

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

describe("porcelainPaths", () => {
  it("extracts a modified path", () => {
    expect(porcelainPaths(" M dprint.json\0")).toEqual(["dprint.json"]);
  });

  it("extracts an untracked path", () => {
    expect(porcelainPaths("?? new-file.ts\0")).toEqual(["new-file.ts"]);
  });

  it("extracts only the destination of a rename, skipping the paired old-path field", () => {
    expect(porcelainPaths("R  new-name.ts\0old-name.ts\0")).toEqual(["new-name.ts"]);
  });

  it("includes a deleted path", () => {
    expect(porcelainPaths(" D removed.ts\0")).toEqual(["removed.ts"]);
  });

  it("returns nothing for a clean tree", () => {
    expect(porcelainPaths("")).toEqual([]);
  });

  it("passes an unusual filename through verbatim, unquoted and unescaped", () => {
    expect(porcelainPaths(" M src/atualização.ts\0")).toEqual(["src/atualização.ts"]);
  });

  it("extracts multiple entries in one call", () => {
    expect(porcelainPaths(" M a.ts\0?? b.ts\0")).toEqual(["a.ts", "b.ts"]);
  });
});

describe("serializeMtimes / parseMtimes", () => {
  it("round-trips an mtime map", () => {
    const map = new Map([
      ["a.ts", 111],
      ["b.ts", 222],
    ]);
    expect(parseMtimes(serializeMtimes(map))).toEqual(map);
  });

  it("parses an empty string to an empty map", () => {
    expect(parseMtimes("")).toEqual(new Map());
  });

  it("round-trips a newline in a path", () => {
    const map = new Map([["weird\nname.ts", 111]]);
    expect(parseMtimes(serializeMtimes(map))).toEqual(map);
  });
});

describe("changedPaths", () => {
  it("does not report a path whose recorded mtime is unchanged", () => {
    const current = new Map([["src/foo.ts", 100]]);
    const previous = new Map([["src/foo.ts", 100]]);
    expect(changedPaths(current, previous)).toEqual([]);
  });

  it("reports a path with a different mtime as changed, even if it was already dirty", () => {
    const current = new Map([["src/foo.ts", 200]]);
    const previous = new Map([["src/foo.ts", 100]]);
    expect(changedPaths(current, previous)).toEqual(["src/foo.ts"]);
  });

  it("reports a path absent from the previous mtime map as changed", () => {
    const current = new Map([["src/foo.ts", 100]]);
    const previous = new Map<string, number>();
    expect(changedPaths(current, previous)).toEqual(["src/foo.ts"]);
  });

  it("does not resurrect an unrelated already-dirty path when something else changes", () => {
    const current = new Map([
      ["src/foo.ts", 100],
      ["README.md", 200],
    ]);
    const previous = new Map([
      ["src/foo.ts", 100],
      ["README.md", 100],
    ]);
    expect(changedPaths(current, previous)).toEqual(["README.md"]);
  });

  it("reports a path gone from current entirely", () => {
    const current = new Map<string, number>();
    const previous = new Map([["src/foo.ts", 100]]);
    expect(changedPaths(current, previous)).toEqual(["src/foo.ts"]);
  });
});

describe("mtimeOf / pathMtimes", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "docs-nudge-mtime-test-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns a real file's mtime", () => {
    writeFileSync(join(root, "a.ts"), "content");
    const mtime = mtimeOf(root, "a.ts");
    expect(mtime).toBeGreaterThan(0);
  });

  it("returns -1 for a path that does not exist", () => {
    expect(mtimeOf(root, "missing.ts")).toBe(-1);
  });

  it("reflects a real content rewrite as a changed mtime", () => {
    const file = join(root, "a.ts");
    writeFileSync(file, "content");
    const before = mtimeOf(root, "a.ts");
    const future = new Date(Date.now() + 5000);
    utimesSync(file, future, future);
    const after = mtimeOf(root, "a.ts");
    expect(after).not.toBe(before);
  });

  it("maps every given path", () => {
    writeFileSync(join(root, "a.ts"), "content");
    const mtimes = pathMtimes(root, ["a.ts", "missing.ts"]);
    expect(mtimes.get("a.ts")).toBeGreaterThan(0);
    expect(mtimes.get("missing.ts")).toBe(-1);
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
