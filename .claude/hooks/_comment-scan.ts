// Comment detection — read-only AST scan, never a rewrite. A prior version of
// this pipeline auto-stripped new comments at pre-commit; removed because its
// edge cases (nested trivia, JSX expression containers) could silently
// mismatch what the model still holds in context. report-comments.ts nudges
// instead, so a misparse here costs an extra reminder, never a corrupted file.
//
// Uses the real TypeScript parser (not a regex scanner) so a `//` inside a
// string, template literal, or regex literal is never misread as a comment.

import ts from "typescript";

const PRAGMA =
  /^(?:eslint-(?:disable|enable)|@ts-(?:expect-error|ignore|nocheck|check)|prettier-ignore|c8 ignore|istanbul ignore|v8 ignore|@vitest-environment)\b/;

interface Span {
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

/** Line numbers (1-based) of every non-pragma comment fully inside `changedLines`
 * (`null` = unrestricted, every comment counts). */
export function newCommentLines(
  source: string,
  changedLines: ReadonlySet<number> | null,
): number[] {
  const sourceFile = ts.createSourceFile(
    "_.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const lines = new Set<number>();
  for (const span of commentSpans(source)) {
    const startLine = sourceFile.getLineAndCharacterOfPosition(span.start).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(span.end).line + 1;
    if (changedLines !== null) {
      let allChanged = true;
      for (let line = startLine; line <= endLine; line += 1) {
        if (!changedLines.has(line)) {
          allChanged = false;
          break;
        }
      }
      if (!allChanged) {
        continue;
      }
    }
    lines.add(startLine);
  }
  return [...lines].sort((a, b) => a - b);
}
