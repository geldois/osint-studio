import { z } from "zod";

export const MAX_FILE_BYTES = 500_000;

export function isTxtFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
}

export const ingestSchema = z
  .object({
    file: z.instanceof(File).nullable(),
  })
  .refine((data) => data.file !== null, {
    message: "Selecione um arquivo .txt.",
    path: ["file"],
  })
  .refine((data) => data.file === null || isTxtFile(data.file), {
    message: "Selecione um arquivo .txt.",
    path: ["file"],
  })
  .refine((data) => data.file === null || data.file.size <= MAX_FILE_BYTES, {
    message: "Arquivo muito grande (limite de 500 KB).",
    path: ["file"],
  });
export type IngestFormValues = z.infer<typeof ingestSchema>;
