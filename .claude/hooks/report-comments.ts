import { existsSync, readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { newCommentLines, newCommentLinesHash } from "./_comment-scan";
import { GENERATED_PREFIXES } from "./_docs-nudge";
import {
  addContext,
  readEvent,
  repoRelative,
  run,
  toolInput,
  toolName,
  type RepoRelative,
} from "./_hook-io";

const TS_SUFFIXES = new Set([".ts", ".tsx", ".mts", ".cts", ".mjs", ".cjs"]);
const HASH_SUFFIXES = new Set([".sh", ".yml", ".yaml", ".toml"]);
const HASH_FILENAMES = new Set([
  "Dockerfile",
  ".gitconfig",
  ".gitignore",
  ".dockerignore",
  ".editorconfig",
  "run",
  "pre-commit",
  "pre-merge-commit",
  "post-commit",
]);
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
const MAX_REPORTED_LINES = 20;

function main(): void {
  const event = readEvent();
  const file = toolInput(event, "file_path");
  if (!file) {
    return;
  }

  const target = resolveTarget(file);
  if (target === null) {
    return;
  }
  const { path, root, rel } = target;

  const isRead = toolName(event) === "Read";
  const lines = isRead ? null : changedLines(rel, root);
  if (!isRead && lines !== null && lines.size === 0) {
    return;
  }

  const source = readFileSync(path, "utf-8");
  const hits = scan(rel, source, lines);
  if (hits.length > 0) {
    report(rel, hits, isRead);
  }
}

function resolveTarget(file: string): RepoRelative | null {
  const target = repoRelative(file);
  if (target === null || !existsSync(target.path) || !statSync(target.path).isFile()) {
    return null;
  }

  if (GENERATED_PREFIXES.some((prefix) => target.rel.startsWith(prefix))) {
    return null;
  }

  const suffix = target.rel.slice(target.rel.lastIndexOf("."));
  if (
    !HASH_FILENAMES.has(basename(target.rel)) &&
    !TS_SUFFIXES.has(suffix) &&
    !HASH_SUFFIXES.has(suffix)
  ) {
    return null;
  }

  return target;
}

function scan(
  rel: string,
  source: string,
  lines: ReadonlySet<number> | null,
): number[] {
  const suffix = rel.slice(rel.lastIndexOf("."));
  if (TS_SUFFIXES.has(suffix)) {
    return newCommentLines(source, lines);
  }
  return newCommentLinesHash(source, lines);
}

function report(rel: string, hits: number[], preexisting: boolean): void {
  const lead = preexisting ? "Pre-existing comment(s) in" : "New comment on";
  const shown = hits.slice(0, MAX_REPORTED_LINES);
  const overflow = hits.length - shown.length;
  const lines =
    overflow > 0 ? `${shown.join(", ")} (+${String(overflow)} more)` : shown.join(", ");
  addContext(
    `${lead} ${rel} (this repo allows none, anywhere, except a linter-ignore pragma — ` +
      `CLAUDE.md). Lines: ${lines}. Remove it, make the name say what it says, or move the ` +
      "decision into README/TO-DO/docs/architecture/CLAUDE/CONTEXT — now, in this turn. " +
      "Pre-existing is not a reason to leave it, and this holds the same whether it surfaced " +
      "via Read, Edit, MultiEdit, or Write.",
  );
}

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
