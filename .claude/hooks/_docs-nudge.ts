import { statSync } from "node:fs";
import { join } from "node:path";
import { GENERATED_PREFIXES } from "./_hook-io";

const EXCLUDED_PREFIXES = ["docs/", ...GENERATED_PREFIXES];
const EXCLUDED_FILES = new Set([
  "README.md",
  "TO-DO.md",
  "CLAUDE.md",
  "CONTEXT.md",
  "CHANGELOG.md",
  "pnpm-lock.yaml",
]);

export function isRelevantChange(rel: string): boolean {
  if (EXCLUDED_FILES.has(rel)) {
    return false;
  }
  return !EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

export function porcelainPaths(stdout: string): string[] {
  const fields = stdout.split("\0").filter((field) => field.length > 0);
  const paths: string[] = [];
  let i = 0;
  while (i < fields.length) {
    const entry = fields[i] ?? "";
    if (entry.length > 3) {
      const status = entry.slice(0, 2);
      paths.push(entry.slice(3));
      if (status.startsWith("R") || status.startsWith("C")) {
        i += 1;
      }
    }
    i += 1;
  }
  return paths;
}

export function mtimeOf(root: string, rel: string): number {
  try {
    return statSync(join(root, rel)).mtimeMs;
  } catch {
    return -1;
  }
}

export function pathMtimes(root: string, paths: string[]): Map<string, number> {
  return new Map(paths.map((path) => [path, mtimeOf(root, path)]));
}

export function serializeMtimes(map: ReadonlyMap<string, number>): string {
  return [...map.entries()]
    .map(([path, mtime]) => `${String(mtime)}\t${path}`)
    .join("\0");
}

export function parseMtimes(raw: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const record of raw.split("\0")) {
    const tab = record.indexOf("\t");
    if (tab === -1) {
      continue;
    }
    const path = record.slice(tab + 1);
    if (path) {
      map.set(path, Number(record.slice(0, tab)));
    }
  }
  return map;
}

export function changedPaths(
  current: ReadonlyMap<string, number>,
  previous: ReadonlyMap<string, number>,
): string[] {
  const paths = new Set([...current.keys(), ...previous.keys()]);
  return [...paths].filter((path) => current.get(path) !== previous.get(path));
}

const ARCHITECTURE_DIR = "docs/architecture";

export function docsNudgeText(areas: string[]): string {
  const areasList = areas.length > 0 ? ` (existing: ${areas.join(", ")})` : "";
  return (
    "Files changed this turn. Judge, don't act reflexively: was " +
    "the change semantic (business/flow logic, a new library, a new " +
    "pattern, a trade-off worth remembering) or purely mechanical (rename, " +
    `typing, refactor)? If semantic, update the matching ${ARCHITECTURE_DIR}/` +
    `<area>.md${areasList} in natural language — never cite a function, ` +
    "class, or type name. If mechanical, skip."
  );
}
