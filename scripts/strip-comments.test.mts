import { describe, expect, it } from "vitest";
import { commentSpans, isPragmaComment, stripComments } from "./strip-comments.mjs";

describe("stripComments", () => {
  it("removes a whole-line comment, dropping the line entirely", () => {
    const source = "const a = 1;\n// explains nothing\nconst b = 2;\n";
    expect(stripComments(source, null)).toBe("const a = 1;\nconst b = 2;\n");
  });

  it("removes a trailing comment, keeping the code on that line", () => {
    const source = "const a = 1; // explains nothing\nconst b = 2;\n";
    expect(stripComments(source, null)).toBe("const a = 1;\nconst b = 2;\n");
  });

  it("removes a block comment", () => {
    const source = "/* explains nothing */\nconst a = 1;\n";
    expect(stripComments(source, null)).toBe("const a = 1;\n");
  });

  it("never touches a comment-shaped string literal", () => {
    const source = 'const url = "https://example.com"; // real comment\n';
    expect(stripComments(source, null)).toBe('const url = "https://example.com";\n');
  });

  it("never touches comment-shaped text inside a template literal", () => {
    const source = "const s = `not // a comment ${x} still not /* one */`;\n";
    expect(stripComments(source, null)).toBe(source);
  });

  it("preserves an eslint-disable pragma", () => {
    const source =
      "const x: any = 1; // eslint-disable-line @typescript-eslint/no-explicit-any\n";
    expect(stripComments(source, null)).toBe(source);
  });

  it("preserves a ts-expect-error pragma", () => {
    const source = '// @ts-expect-error testing a type error\nconst x: number = "1";\n';
    expect(stripComments(source, null)).toBe(source);
  });

  it("preserves a vitest-environment pragma", () => {
    // Built via concatenation, not a literal magic comment — Vitest's own
    // environment detector greps the raw file text for this exact string,
    // and a literal occurrence here would flip this test file into jsdom.
    const source = "// @vitest-" + 'environment jsdom\nimport { it } from "vitest";\n';
    expect(stripComments(source, null)).toBe(source);
  });

  it("removes a JSX comment without dropping code that follows it on the same line", () => {
    const source = "const el = <div>{/* explains nothing */}<span /></div>;\n";
    const stripped = stripComments(source, null);
    expect(stripped).not.toContain("explains nothing");
    expect(stripped).toContain("<span />");
    expect(stripped).toContain("</div>;");
  });

  it("removes a block comment sitting between real code on both sides", () => {
    const source = "const a = 1 + /* explains nothing */ 2;\n";
    expect(stripComments(source, null)).toBe("const a = 1 +  2;\n");
  });

  it("restricts removal to the given changed lines", () => {
    const source =
      "// old comment, predates this edit\nconst a = 1;\n// new comment, just added\nconst b = 2;\n";
    const stripped = stripComments(source, new Set([3]));
    expect(stripped).toBe(
      "// old comment, predates this edit\nconst a = 1;\nconst b = 2;\n",
    );
  });

  it("removes multiple comments without corrupting later offsets", () => {
    const source =
      "// one\nconst a = 1; // two\nconst b = 2;\n// three\nconst c = 3;\n";
    expect(stripComments(source, null)).toBe(
      "const a = 1;\nconst b = 2;\nconst c = 3;\n",
    );
  });

  it("removes a trailing comment sitting right before a closing brace", () => {
    const source = "function f(): number {\n  return 1; // trailing too\n}\n";
    expect(stripComments(source, null)).toBe(
      "function f(): number {\n  return 1;\n}\n",
    );
  });

  it("is a no-op on a file with no comments", () => {
    const source = "const a = 1;\nconst b = 2;\n";
    expect(stripComments(source, null)).toBe(source);
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

describe("commentSpans", () => {
  it("finds exactly one span per comment, even where trivia overlaps", () => {
    const source = "const a = 1; // one\n// two\nconst b = 2;\n";
    expect(commentSpans(source)).toHaveLength(2);
  });
});
