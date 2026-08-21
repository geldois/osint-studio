import { z } from "zod";
import type { TextPatternCatalog } from "@/types/api";

export const MAX_TEXT_FILE_BYTES = 1_000_000;
export const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024;

export type IngestKind = "spreadsheet" | "text";

export function ingestKindFor(file: File): IngestKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) {
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

export function defaultSelectedPatterns(catalog: TextPatternCatalog): string[] {
  return catalog.patterns.map((pattern) => pattern.name);
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
    message: "Selecione um arquivo .txt, .csv ou .xlsx.",
    path: ["file"],
  })
  .refine((data) => data.file === null || ingestKindFor(data.file) !== null, {
    message: "Formato não suportado. Use .txt, .csv ou .xlsx.",
    path: ["file"],
  })
  .refine((data) => data.file === null || isWithinSizeLimit(data.file), {
    message: "Arquivo acima do limite (1 MB para .txt, 10 MB para planilha).",
    path: ["file"],
  });

export type IngestFormValues = z.infer<typeof ingestSchema>;
