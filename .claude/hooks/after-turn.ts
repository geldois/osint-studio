// End-of-turn type check and ADR nudge — `Stop`.
//
// One process, one injection, read-only. Runs at the end of the turn
// rather than per edit for two reasons: the code is finally complete
// (mid-refactor a type-checker reports cascading errors from code not yet
// written, and the model chases them), and one run costs a fraction of one
// run per edit.
//
// `tsc` has no reliable single-file mode with full project (tsconfig)
// context, so unlike the per-file `report-lint` pass this always
// type-checks the whole project — `incremental: true` in tsconfig.json
// keeps repeat runs cheap via `.tsbuildinfo`.
//
// Both signals derive from `git status --porcelain` — no marker files, no
// temp-directory sweep, and accurate even across a session restart.

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { context, gitRoot, readEvent, run } from "./_hook-io";

const TSC = ["pnpm", "exec", "tsc", "--noEmit"];
const MAX_OUTPUT_LINES = 40;
const TS_SUFFIXES = new Set([".ts", ".tsx"]);
const PATH_START = 3; // porcelain line is "XY <path>"

const ADR_NUDGE =
  "TypeScript files changed this turn. Judge, don't act reflexively: was " +
  "the change an architectural decision (new library, new pattern, a " +
  "trade-off worth remembering) or purely mechanical (rename, typing, " +
  "refactor)? If architectural, add a new docs/adr/NNNN-<slug>.md " +
  "following the existing entries. If mechanical, skip.";

function main(): void {
  const event = readEvent();
  // Claude Code sets this when the turn was itself resumed by a Stop hook.
  // Without the guard, an unfixable type error would loop forever.
  if (event["stop_hook_active"] === true) {
    return;
  }

  const root = gitRoot(process.cwd());
  if (root === null) {
    return;
  }

  const changed = changedFiles(root);
  if (changed.length === 0) {
    return;
  }

  const tsChanged = changed.filter((path) => TS_SUFFIXES.has(suffixOf(path)));
  if (tsChanged.length === 0) {
    return;
  }

  const sections = [typeErrors(root), ADR_NUDGE].filter((section) => section !== "");
  if (sections.length > 0) {
    context("Stop", sections.join("\n\n"));
  }
}

function suffixOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

/** Paths changed vs HEAD, staged, unstaged or untracked; repo-relative. */
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
    // A rename entry is "R  old -> new"; only the destination exists.
    const segments = line.slice(PATH_START).split(" -> ");
    const path = (segments.at(-1) ?? "").replace(/^"|"$/g, "");
    if (existsSync(resolve(root, path)) && statSync(resolve(root, path)).isFile()) {
      paths.push(path);
    }
  }
  return paths;
}

function typeErrors(root: string): string {
  const result = run(TSC, root);
  if (result === null || result.status === 0) {
    return "";
  }
  const output = result.stdout || result.stderr;
  const lines = output.split("\n").slice(0, MAX_OUTPUT_LINES);
  return `── tsc ──\n${lines.join("\n")}`;
}

main();
