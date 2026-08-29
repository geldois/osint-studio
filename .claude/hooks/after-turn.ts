import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { context, gitRoot, readEvent, run, stopReinvoked } from "./_hook-io";

const TS_SUFFIXES = new Set([".ts", ".tsx"]);
const PATH_START = 3;
const ARCHITECTURE_DIR = "docs/architecture";
const ADR_DIR = "docs/adr";

function main(): void {
  const event = readEvent();
  if (stopReinvoked(event)) {
    return;
  }

  const root = gitRoot(process.cwd());
  if (root === null) {
    return;
  }

  const changed = changedFiles(root);
  const tsChanged = changed.filter((path) => TS_SUFFIXES.has(suffixOf(path)));
  if (tsChanged.length === 0) {
    return;
  }

  const nudge = docsNudge(root);
  if (nudge !== "") {
    context("Stop", nudge);
  }
}

function docsNudge(root: string): string {
  const architectureDir = resolve(root, ARCHITECTURE_DIR);
  if (!existsSync(architectureDir)) {
    return "";
  }
  const areas = readdirSync(architectureDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length))
    .sort();
  const areasList = areas.length > 0 ? ` (existing: ${areas.join(", ")})` : "";

  let nudge =
    "TypeScript files changed this turn. Judge, don't act reflexively: was " +
    "the change semantic (business/flow logic, a new library, a new " +
    "pattern, a trade-off worth remembering) or purely mechanical (rename, " +
    `typing, refactor)? If semantic, update the matching ${ARCHITECTURE_DIR}/` +
    `<area>.md${areasList} in natural language — never cite a function, ` +
    "class, or type name. If mechanical, skip.";

  if (existsSync(resolve(root, ADR_DIR))) {
    nudge +=
      ` This project's ${ADR_DIR}/ already has entries too — manage-docs ` +
      `still prefers migrating a decision into ${ARCHITECTURE_DIR}/<area>.md ` +
      "over a new ADR, unless the user explicitly asked for ADRs here.";
  }

  return nudge;
}

function suffixOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function changedFiles(root: string): string[] {
  const result = run(["git", "status", "--porcelain", "--untracked-files=all"], root);
  if (result?.status !== 0) {
    return [];
  }

  const paths: string[] = [];
  for (const line of result.stdout.split("\n")) {
    if (line.length <= PATH_START || line.startsWith("D") || line[1] === "D") {
      continue;
    }
    const segments = line.slice(PATH_START).split(" -> ");
    const path = (segments.at(-1) ?? "").replace(/^"|"$/g, "");
    if (existsSync(resolve(root, path)) && statSync(resolve(root, path)).isFile()) {
      paths.push(path);
    }
  }
  return paths;
}

main();
