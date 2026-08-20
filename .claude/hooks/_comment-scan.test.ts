import { describe, expect, it } from "vitest";
import { isPragmaComment, newCommentLines } from "./_comment-scan";

describe("newCommentLines", () => {
  it("reports a whole-line comment's line", () => {
    const source = "const a = 1;\n// explains nothing\nconst b = 2;\n";
    expect(newCommentLines(source, null)).toEqual([2]);
  });

  it("reports a trailing comment's line", () => {
    const source = "const a = 1; // explains nothing\nconst b = 2;\n";
    expect(newCommentLines(source, null)).toEqual([1]);
  });

  it("reports a block comment's line", () => {
    const source = "/* explains nothing */\nconst a = 1;\n";
    expect(newCommentLines(source, null)).toEqual([1]);
  });

  it("never flags a comment-shaped string literal", () => {
    const source = 'const url = "https://example.com"; // real comment\n';
    expect(newCommentLines(source, null)).toEqual([1]);
  });

  it("never flags comment-shaped text inside a template literal", () => {
    const source = "const s = `not // a comment ${x} still not /* one */`;\n";
    expect(newCommentLines(source, null)).toEqual([]);
  });

  it("does not flag an eslint-disable pragma", () => {
    const source =
      "const x: any = 1; // eslint-disable-line @typescript-eslint/no-explicit-any\n";
    expect(newCommentLines(source, null)).toEqual([]);
  });

  it("does not flag a ts-expect-error pragma", () => {
    const source = '// @ts-expect-error testing a type error\nconst x: number = "1";\n';
    expect(newCommentLines(source, null)).toEqual([]);
  });

  it("does not flag a vitest-environment pragma", () => {
    // Built via concatenation, not a literal magic comment — Vitest's own
    // environment detector greps the raw file text for this exact string,
    // and a literal occurrence here would flip this test file into jsdom.
    const source = "// @vitest-" + 'environment jsdom\nimport { it } from "vitest";\n';
    expect(newCommentLines(source, null)).toEqual([]);
  });

  it("flags a JSX comment container without losing the surrounding code", () => {
    const source = "const el = <div>{/* explains nothing */}<span /></div>;\n";
    expect(newCommentLines(source, null)).toEqual([1]);
  });

  it("flags a block comment sitting between real code on both sides", () => {
    const source = "const a = 1 + /* explains nothing */ 2;\n";
    expect(newCommentLines(source, null)).toEqual([1]);
  });

  it("restricts to the given changed lines", () => {
    const source =
      "// old comment, predates this edit\nconst a = 1;\n// new comment, just added\nconst b = 2;\n";
    expect(newCommentLines(source, new Set([3]))).toEqual([3]);
  });

  it("reports every comment line when unrestricted", () => {
    const source =
      "// one\nconst a = 1; // two\nconst b = 2;\n// three\nconst c = 3;\n";
    expect(newCommentLines(source, null)).toEqual([1, 2, 4]);
  });

  it("is empty on a file with no comments", () => {
    const source = "const a = 1;\nconst b = 2;\n";
    expect(newCommentLines(source, null)).toEqual([]);
  });

  it("is empty when the changed-lines set is empty", () => {
    const source = "// untouched\nconst a = 1;\n";
    expect(newCommentLines(source, new Set())).toEqual([]);
  });
});

describe("isPragmaComment", () => {
  it("recognizes every allowlisted pragma shape", () => {
    expect(isPragmaComment("// eslint-disable-next-line no-console")).toBe(true);
    expect(isPragmaComment("/* eslint-disable */")).toBe(true);
    expect(isPragmaComment("// @ts-ignore")).toBe(true);
    expect(isPragmaComment("// @ts-nocheck")).toBe(true);
    expect(isPragmaComment("// prettier-ignore")).toBe(true);
    expect(isPragmaComment("// c8 ignore next")).toBe(true);
    expect(isPragmaComment("// istanbul ignore next")).toBe(true);
    expect(isPragmaComment("// v8 ignore next")).toBe(true);
  });

  it("rejects an ordinary comment even if it mentions a pragma word", () => {
    expect(isPragmaComment("// this used to have an eslint-disable here")).toBe(false);
  });
});
