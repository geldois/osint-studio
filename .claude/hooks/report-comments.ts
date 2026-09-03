import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { newCommentLines, newCommentLinesHash } from "./_comment-scan";
import { addContext, gitRoot, readEvent, run, toolInput, toolName } from "./_hook-io";

const TS_SUFFIXES = new Set([".ts", ".tsx"]);
const HASH_SUFFIXES = new Set([".sh", ".yml", ".yaml", ".toml"]);
const HASH_FILENAMES = new Set([
  "Dockerfile",
  ".gitconfig",
  ".gitignore",
  ".dockerignore",
  ".editorconfig",
  ".nvmrc",
  "run",
]);
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
const EXCLUDED_PREFIXES = ["node_modules/", ".next/", ".cache/", "build/", "coverage/"];
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

interface Target {
  path: string;
  root: string;
  rel: string;
}

function resolveTarget(file: string): Target | null {
  const path = isAbsolute(file) ? file : resolve(process.cwd(), file);
  if (!existsSync(path) || !statSync(path).isFile()) {
    return null;
  }

  const root = gitRoot(path);
  if (root === null || !path.startsWith(root + sep)) {
    return null;
  }

  const rel = relative(root, path).split(sep).join("/");
  if (EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
    return null;
  }

  const suffix = rel.slice(rel.lastIndexOf("."));
  if (
    !HASH_FILENAMES.has(basename(rel)) &&
    !TS_SUFFIXES.has(suffix) &&
    !HASH_SUFFIXES.has(suffix)
  ) {
    return null;
  }

  return { path, root, rel };
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
      `CLAUDE.md). Lines: ${lines}. Remove it, make the name say what it says, ` +
      "or move the decision into README/TO-DO/docs/architecture/CLAUDE/CONTEXT.",
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
