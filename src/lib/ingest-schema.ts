import { z } from "zod";
import type { TextPatternCatalog } from "@/types/api";

export const MAX_TEXT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024;

export type IngestKind = "spreadsheet" | "text";

export function ingestKindFor(file: File): IngestKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return "text";
  }
  if (name.endsWith(".csv") || name.endsWith(".xlsx")) {
    return "spreadsheet";
  }
  return null;
}

export function maxBytesFor(kind: IngestKind): number {
  return kind === "spreadsheet" ? MAX_SPREADSHEET_BYTES : MAX_TEXT_FILE_BYTES;
}

const DEFAULT_PATTERN_NAMES = ["CPF_LOOSE", "CNPJ_LOOSE"];

export function defaultSelectedPatterns(catalog: TextPatternCatalog): string[] {
  const available = new Set(catalog.patterns.map((pattern) => pattern.name));
  const defaults = DEFAULT_PATTERN_NAMES.filter((name) => available.has(name));
  return defaults.length > 0
    ? defaults
    : catalog.patterns.map((pattern) => pattern.name);
}

function isWithinSizeLimit(file: File): boolean {
  const kind = ingestKindFor(file);
  return kind === null || file.size <= maxBytesFor(kind);
}

export const ingestSchema = z
  .object({
    file: z.instanceof(File).nullable(),
    patterns: z.array(z.string()).min(1, "Selecione ao menos um padrão."),
  })
  .refine((data) => data.file !== null, {
    message: "Selecione um arquivo .txt, .md, .csv ou .xlsx.",
    path: ["file"],
  })
  .refine((data) => data.file === null || ingestKindFor(data.file) !== null, {
    message: "Formato não suportado. Use .txt, .md, .csv ou .xlsx.",
    path: ["file"],
  })
  .refine((data) => data.file === null || isWithinSizeLimit(data.file), {
    message: "Arquivo acima do limite (10 MB).",
    path: ["file"],
  });

export type IngestFormValues = z.infer<typeof ingestSchema>;
