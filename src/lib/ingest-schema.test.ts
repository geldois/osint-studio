import { describe, expect, it } from "vitest";
import { ingestSchema, MAX_FILE_BYTES } from "@/lib/ingest-schema";

function makeFile(name: string, size: number, type = "text/plain"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("ingestSchema", () => {
  it("parses a valid .txt file within the size limit", () => {
    const result = ingestSchema.safeParse({ file: makeFile("notes.txt", 1024) });
    expect(result.success).toBe(true);
  });

  it("rejects a file with the wrong extension", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.pdf", 1024, "application/pdf"),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Selecione um arquivo .txt.");
    }
  });

  it("rejects a file larger than the byte limit", () => {
    const result = ingestSchema.safeParse({
      file: makeFile("notes.txt", MAX_FILE_BYTES + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Arquivo muito grande (limite de 500 KB).",
      );
    }
  });

  it("rejects when no file has been selected yet", () => {
    const result = ingestSchema.safeParse({ file: null });
    expect(result.success).toBe(false);
  });
});
