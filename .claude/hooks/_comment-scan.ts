import ts from "typescript";

const PRAGMA =
  /^(?:eslint-(?:disable|enable)|@ts-(?:expect-error|ignore|nocheck|check)|prettier-ignore|c8 ignore|istanbul ignore|v8 ignore|@vitest-environment)\b/;

const HASH_PRAGMA =
  /^#\s*(?:shellcheck\s+(?:disable|enable|source)=\S+|v\d+(?:\.\d+){1,2})\s*$/;

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
    collectAt(node.getEnd());
    collectEmptyJsxExpression(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return spans;
}

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

export function newCommentLinesHash(
  source: string,
  changedLines: ReadonlySet<number> | null,
): number[] {
  const lines: number[] = [];
  const rows = source.split("\n");
  for (let i = 0; i < rows.length; i += 1) {
    const lineNumber = i + 1;
    if (changedLines !== null && !changedLines.has(lineNumber)) {
      continue;
    }
    const row = rows[i] ?? "";
    if (lineNumber === 1 && row.startsWith("#!")) {
      continue;
    }
    const index = unquotedHashIndex(row);
    if (index === null) {
      continue;
    }
    if (HASH_PRAGMA.test(row.slice(index).trim())) {
      continue;
    }
    lines.push(lineNumber);
  }
  return lines;
}

function unquotedHashIndex(content: string): number | null {
  let inSingle = false;
  let inDouble = false;
  let i = 0;
  while (i < content.length) {
    const char = content[i];
    if (inSingle) {
      if (char === "'") {
        inSingle = false;
      }
    } else if (inDouble) {
      if (char === "\\") {
        i += 1;
      } else if (char === '"') {
        inDouble = false;
      }
    } else if (char === "'") {
      inSingle = true;
    } else if (char === '"') {
      inDouble = true;
    } else if (char === "#") {
      return i;
    }
    i += 1;
  }
  return null;
}
