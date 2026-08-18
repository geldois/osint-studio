// Pure comment removal for TypeScript/TSX source, mirroring osint-engine's
// scripts/_comments.py: distinguishes a real comment from a linter/tooling
// pragma via a closed, tool-documented allowlist, never by guessing intent.
// Uses the real TypeScript parser (not a regex scanner) so a `//` inside a
// string, template literal, or regex literal is never misread as a comment.
//
// Both entry points take an optional `changedLines` set restricting removal
// to those line numbers — the caller passes the file's current
// git-diff-vs-HEAD line set, so a comment predating this edit (the agent's or
// a human's) is never touched, only what this edit actually changed.
// `null` means unrestricted, used by the tests exercising the pure logic.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const PRAGMA =
  /^(?:eslint-(?:disable|enable)|@ts-(?:expect-error|ignore|nocheck|check)|prettier-ignore|c8 ignore|istanbul ignore|v8 ignore|@vitest-environment)\b/;

export interface Span {
  start: number;
  end: number;
}

export function isPragmaComment(commentText: string): boolean {
  const body = commentText
    .replace(/^\/\//, "")
    .replace(/^\/\*/, "")
    .replace(/\*\/$/, "")
    .trim();
  return PRAGMA.test(body);
}

function isShebang(pos: number, commentText: string): boolean {
  return pos === 0 && commentText.startsWith("#!");
}

export function commentSpans(source: string): Span[] {
  const sourceFile = ts.createSourceFile(
    "_.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const spans: Span[] = [];
  const seen = new Set<number>();

  const addSpan = (start: number, end: number): void => {
    if (seen.has(start)) {
      return;
    }
    seen.add(start);
    const text = source.slice(start, end);
    if (isShebang(start, text) || isPragmaComment(text)) {
      return;
    }
    spans.push({ start, end });
  };

  const collectAt = (pos: number): void => {
    const ranges = [
      ...(ts.getLeadingCommentRanges(source, pos) ?? []),
      ...(ts.getTrailingCommentRanges(source, pos) ?? []),
    ];
    for (const range of ranges) {
      addSpan(range.pos, range.end);
    }
  };

  // A JSX expression container holding nothing but a comment (`{/* .. */}`)
  // parses its content as trivia the scanner never exposes as a comment
  // range — the container itself has no `expression` child to recurse into,
  // so this is the one place a comment must be found by trimming the
  // container's own text instead of asking the scanner for trivia.
  const collectEmptyJsxExpression = (node: ts.Node): void => {
    if (!ts.isJsxExpression(node) || node.expression !== undefined) {
      return;
    }
    const openBrace = node.getStart(sourceFile) + 1;
    const closeBrace = node.getEnd() - 1;
    const inner = source.slice(openBrace, closeBrace);
    const trimmed = inner.trim();
    if (trimmed === "" || !(trimmed.startsWith("//") || trimmed.startsWith("/*"))) {
      return;
    }
    const start = openBrace + (inner.length - inner.trimStart().length);
    addSpan(start, start + trimmed.length);
  };

  const visit = (node: ts.Node): void => {
    collectAt(node.getFullStart());
    // Trailing trivia between this node's last real token and its own end
    // (e.g. a comment sitting right before a closing brace, which has no
    // child node of its own for the next getFullStart() to reach).
    collectAt(node.getEnd());
    collectEmptyJsxExpression(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return spans;
}

function lineOf(sourceFile: ts.SourceFile, offset: number): number {
  return sourceFile.getLineAndCharacterOfPosition(offset).line + 1;
}

function inChangedLines(
  sourceFile: ts.SourceFile,
  span: Span,
  changedLines: ReadonlySet<number> | null,
): boolean {
  if (changedLines === null) {
    return true;
  }
  const startLine = lineOf(sourceFile, span.start);
  const endLine = lineOf(sourceFile, span.end);
  for (let line = startLine; line <= endLine; line += 1) {
    if (!changedLines.has(line)) {
      return false;
    }
  }
  return true;
}

function applySpan(source: string, span: Span): string {
  const lastNewline = source.lastIndexOf("\n", span.start - 1);
  const lineStart = lastNewline + 1;
  const prefix = source.slice(lineStart, span.start);

  const nextNewline = source.indexOf("\n", span.end);
  const lineEnd = nextNewline === -1 ? source.length : nextNewline;
  const suffix = source.slice(span.end, lineEnd);

  if (prefix.trim() === "" && suffix.trim() === "") {
    // The comment is the only thing on its line: drop the whole line.
    const removeEnd = nextNewline === -1 ? source.length : nextNewline + 1;
    return source.slice(0, lineStart) + source.slice(removeEnd);
  }

  if (suffix.trim() === "") {
    // Trailing comment at the end of a line that has real code before it:
    // trim from the span's start onward, dropping the whitespace it leaves.
    const trimmedPrefix = prefix.replace(/[ \t]+$/, "");
    return source.slice(0, lineStart) + trimmedPrefix + source.slice(lineEnd);
  }

  // Real code follows the comment on the same line too (e.g. inside a JSX
  // expression container) — remove only the comment's own span.
  return source.slice(0, span.start) + source.slice(span.end);
}

export function stripComments(
  source: string,
  changedLines: ReadonlySet<number> | null,
): string {
  const sourceFile = ts.createSourceFile(
    "_.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const spans = commentSpans(source).filter((span) =>
    inChangedLines(sourceFile, span, changedLines),
  );
  if (spans.length === 0) {
    return source;
  }

  let result = source;
  for (const span of [...spans].sort((a, b) => b.start - a.start)) {
    result = applySpan(result, span);
  }
  return result;
}

// CLI entry point: strip newly-changed comments from the given paths in
// place. Called from `scripts/run` during `precommit`, on fully-staged files
// only — never from a standalone `run fix`, so a bare fixer pass never
// blanket-strips a whole file's pre-existing comments in one sweep.

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

function changedLines(path: string): Set<number> {
  const result = spawnSync(
    "git",
    ["diff", "HEAD", "--no-color", "--no-ext-diff", "-U0", "--", path],
    { encoding: "utf-8" },
  );
  const lines = new Set<number>();
  if (result.status !== 0) {
    return lines;
  }
  for (const line of result.stdout.split("\n")) {
    const match = HUNK_HEADER.exec(line);
    if (match === null) {
      continue;
    }
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    for (let i = 0; i < count; i += 1) {
      lines.add(start + i);
    }
  }
  return lines;
}

function main(): void {
  for (const path of process.argv.slice(2)) {
    const lines = changedLines(path);
    if (lines.size === 0) {
      continue;
    }
    const original = readFileSync(path, "utf-8");
    const stripped = stripComments(original, lines);
    if (stripped !== original) {
      writeFileSync(path, stripped, "utf-8");
    }
  }
}

const entryPoint = process.argv[1];
if (entryPoint !== undefined && import.meta.url === `file://${entryPoint}`) {
  main();
}
