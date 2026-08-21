import { describe, expect, it } from "vitest";
import {
  defaultSelectedPatterns,
  ingestKindFor,
  ingestSchema,
  MAX_SPREADSHEET_BYTES,
  MAX_TEXT_FILE_BYTES,
  maxBytesFor,
} from "@/lib/ingest-schema";
import type { TextPatternCatalog } from "@/types/api";

function makeFile(name: string, size = 1024): File {
  return new File([new Uint8Array(size)], name);
}

const ALL_PATTERNS = ["CPF_LOOSE"];

describe("ingestKindFor", () => {
  it.each([
    ["notes.txt", "text"],
    ["NOTES.TXT", "text"],
    ["sheet.csv", "spreadsheet"],
    ["SHEET.CSV", "spreadsheet"],
    ["book.xlsx", "spreadsheet"],
    ["BOOK.XLSX", "spreadsheet"],
  ])("maps %s to %s", (name, expected) => {
    expect(ingestKindFor(makeFile(name))).toBe(expected);
  });

  it.each(["notes.pdf", "archive.zip", "noextension", "payload.txt.exe", ".txt.md"])(
    "maps %s to null",
    (name) => {
      expect(ingestKindFor(makeFile(name))).toBeNull();
    },
  );
});

describe("maxBytesFor", () => {
  it("gives the spreadsheet limit the backend enforces", () => {
    expect(maxBytesFor("spreadsheet")).toBe(MAX_SPREADSHEET_BYTES);
    expect(MAX_SPREADSHEET_BYTES).toBe(10 * 1024 * 1024);
  });

  it("gives the text limit the frontend chose", () => {
    expect(maxBytesFor("text")).toBe(MAX_TEXT_FILE_BYTES);
    expect(MAX_TEXT_FILE_BYTES).toBe(1_000_000);
  });
});

describe("defaultSelectedPatterns", () => {
  it("selects every atomic pattern, in catalog order, ignoring bundles", () => {
    const catalog: TextPatternCatalog = {
      patterns: [
        { name: "CPF_LOOSE", node_type: "Person", fields: ["cpf"] },
        { name: "CNPJ_LOOSE", node_type: "Company", fields: ["cnpj"] },
      ],
      bundles: [{ id: "brazilian_documents_v1", pattern_names: ["CPF_LOOSE"] }],
    };
    expect(defaultSelectedPatterns(catalog)).toEqual(["CPF_LOOSE", "CNPJ_LOOSE"]);
  });

  it("returns nothing for a catalog with no atomic patterns", () => {
    const catalog: TextPatternCatalog = {
      patterns: [],
      bundles: [{ id: "empty", pattern_names: ["GHOST"] }],
    };
    expect(defaultSelectedPatterns(catalog)).toEqual([]);
  });
});

describe("ingestSchema", () => {
  it("parses a .txt within its limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.txt"),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(true);
  });

  it.each(["sheet.csv", "book.xlsx"])("parses %s within its limit", (name) => {
    const result = ingestSchema.safeParse({
      file: makeFile(name),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a .txt of exactly the text limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.txt", MAX_TEXT_FILE_BYTES),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a .txt one byte past the text limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.txt", MAX_TEXT_FILE_BYTES + 1),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a .csv well past the text limit but under the spreadsheet limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("sheet.csv", MAX_TEXT_FILE_BYTES + 1),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a .csv of exactly the spreadsheet limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("sheet.csv", MAX_SPREADSHEET_BYTES),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a .csv one byte past the spreadsheet limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("sheet.csv", MAX_SPREADSHEET_BYTES + 1),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a .xlsx one byte past the spreadsheet limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("book.xlsx", MAX_SPREADSHEET_BYTES + 1),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a .txt at a size a spreadsheet would be allowed", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.txt", MAX_SPREADSHEET_BYTES),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a file with an unsupported extension", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.pdf"),
      patterns: ALL_PATTERNS,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Formato não suportado. Use .txt, .csv ou .xlsx.",
      );
    }
  });

  it("rejects when no file has been selected yet", () => {
    const result = ingestSchema.safeParse({ file: null, patterns: ALL_PATTERNS });
    expect(result.success).toBe(false);
  });

  it("rejects an empty pattern selection", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.txt"),
      patterns: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Selecione ao menos um padrão.");
    }
  });
});
