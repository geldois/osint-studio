// Comment-introduction nudge — `PostToolUse(Edit|Write|MultiEdit)`.
//
// Read-only: reports, never strips — see `_comment-scan.ts`'s header for why
// the prior auto-stripping pipeline was removed. Flags a newly-introduced,
// non-pragma comment inside a path CLAUDE.md forbids one from, so the model
// removes it or renames instead of leaving it to a fixer that no longer runs.

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { newCommentLines } from "./_comment-scan";
import { addContext, gitRoot, readEvent, run, toolInput } from "./_hook-io";

const ENFORCED_ROOTS = ["src/"];
const SUFFIXES = new Set([".ts", ".tsx"]);
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

function main(): void {
  const file = toolInput(readEvent(), "file_path");
  if (!file) {
    return;
  }

  const path = isAbsolute(file) ? file : resolve(process.cwd(), file);
  if (!existsSync(path) || !statSync(path).isFile()) {
    return;
  }

  const root = gitRoot(path);
  if (root === null || !path.startsWith(root + sep)) {
    return;
  }

  const rel = relative(root, path).split(sep).join("/");
  const suffix = rel.slice(rel.lastIndexOf("."));
  if (
    !SUFFIXES.has(suffix) ||
    !ENFORCED_ROOTS.some((enforced) => rel.startsWith(enforced))
  ) {
    return;
  }

  const lines = changedLines(rel, root);
  if (lines !== null && lines.size === 0) {
    return;
  }

  const source = readFileSync(path, "utf-8");
  const hits = newCommentLines(source, lines);
  if (hits.length > 0) {
    addContext(
      `New comment on ${rel} (no comments in enforced paths — CLAUDE.md). ` +
        `Lines: ${hits.join(", ")}. Remove it, or make the name say what it says.`,
    );
  }
}

/** `null` means every line counts (an untracked/new file has no HEAD version
 * for `git diff` to compare against). Empty set means a tracked file with no
 * actual diff, so nothing to scan. */
function changedLines(rel: string, root: string): ReadonlySet<number> | null {
  const status = run(["git", "status", "--porcelain", "--", rel], root);
  if (status?.stdout.startsWith("??") === true) {
    return null;
  }

  const diff = run(
    ["git", "diff", "HEAD", "--no-color", "--no-ext-diff", "-U0", "--", rel],
    root,
  );
  if (diff?.status !== 0) {
    return new Set();
  }

  const result = new Set<number>();
  for (const line of diff.stdout.split("\n")) {
    const match = HUNK_HEADER.exec(line);
    if (match === null) {
      continue;
    }
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    for (let i = 0; i < count; i += 1) {
      result.add(start + i);
    }
  }
  return result;
}

main();
