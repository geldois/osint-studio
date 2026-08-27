import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ApiSchemaError,
  fetchEntityRecordCatalog,
  fetchEntityRecordsByCpf,
  fetchGraphByCpf,
  ingestFile,
  ingestText,
} from "@/lib/api";
import { translateError, UNKNOWN_ERROR_MESSAGE } from "@/lib/errors";

function makeZodError(): z.ZodError {
  const result = z.object({ id: z.string() }).safeParse({});
  if (result.success) {
    throw new Error("expected safeParse to fail");
  }
  return result.error;
}

const EMPTY_GRAPH = {
  content_id: "g1",
  edges: [],
  nodes: [],
  revision: {
    fetched_at: "2026-08-21T14:03:00Z",
    merged_at: null,
    provider: "text_ingestion",
  },
  root_id: "r1",
};

function stubFetchReturning(payload: unknown): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function requestInitFrom(mock: ReturnType<typeof vi.fn>): RequestInit {
  return mock.mock.calls[0]?.[1] as RequestInit;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiSchemaError", () => {
  it("carries the original ZodError as its cause", () => {
    const zodError = makeZodError();
    const error = new ApiSchemaError(zodError);
    expect(error.cause).toBe(zodError);
  });

  it("translates to the generic unexpected-error message, never the technical Zod message", () => {
    const error = new ApiSchemaError(makeZodError());
    expect(translateError(error)).toBe(UNKNOWN_ERROR_MESSAGE);
  });
});

describe("ingestText", () => {
  it("sends patterns as an array, never the retired pattern_set_id", async () => {
    const mock = stubFetchReturning(EMPTY_GRAPH);
    await ingestText("CPF 111.444.777-35", ["CPF_LOOSE", "CNPJ_LOOSE"], "t0ken");

    const body = JSON.parse(requestInitFrom(mock).body as string) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({
      text: "CPF 111.444.777-35",
      patterns: ["CPF_LOOSE", "CNPJ_LOOSE"],
    });
    expect(body).not.toHaveProperty("pattern_set_id");
  });

  it("posts to the text-ingestion endpoint with the bearer token", async () => {
    const mock = stubFetchReturning(EMPTY_GRAPH);
    await ingestText("t", ["CPF_LOOSE"], "t0ken");

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/text-ingestion$/);
    const init = requestInitFrom(mock);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer t0ken" });
  });
});

describe("fetchGraphByCpf", () => {
  it("defaults to force=false when no override is given", async () => {
    const mock = stubFetchReturning(EMPTY_GRAPH);
    await fetchGraphByCpf("11144477735", "t0ken");

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/cpf\/11144477735\?force=false$/);
  });

  it("sends force=true when a re-fetch is explicitly requested", async () => {
    const mock = stubFetchReturning(EMPTY_GRAPH);
    await fetchGraphByCpf("11144477735", "t0ken", true);

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/cpf\/11144477735\?force=true$/);
  });
});

const ENTITY_RECORD = {
  id: "rec1",
  entity_id: "e1",
  entity_ref: { id: "e1", content_id: "c1" },
  outcome: "expanded",
  provider: "kipflow",
  requested_at: "2026-08-21T14:03:00Z",
  username: "alice",
};

describe("fetchEntityRecordsByCpf", () => {
  it("requests the per-cpf consumption endpoint", async () => {
    const mock = stubFetchReturning([ENTITY_RECORD]);
    const records = await fetchEntityRecordsByCpf("11144477735", "t0ken");

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/consumption\/11144477735$/);
    expect(records).toEqual([ENTITY_RECORD]);
  });
});

describe("fetchEntityRecordCatalog", () => {
  it("requests the consumption catalog endpoint", async () => {
    const mock = stubFetchReturning([ENTITY_RECORD]);
    const records = await fetchEntityRecordCatalog("t0ken");

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/consumption$/);
    expect(records).toEqual([ENTITY_RECORD]);
  });
});

describe("ingestFile", () => {
  it("appends one patterns field per selected pattern", async () => {
    const mock = stubFetchReturning(EMPTY_GRAPH);
    const file = new File([new Uint8Array(8)], "sheet.csv");
    await ingestFile(file, ["CPF_LOOSE", "CNPJ_LOOSE"], "t0ken");

    const body = requestInitFrom(mock).body as FormData;
    expect(body.getAll("patterns")).toEqual(["CPF_LOOSE", "CNPJ_LOOSE"]);
    expect(body.get("file")).toBe(file);
  });

  it("leaves Content-Type unset so the browser can generate the multipart boundary", async () => {
    const mock = stubFetchReturning(EMPTY_GRAPH);
    await ingestFile(
      new File([new Uint8Array(8)], "sheet.csv"),
      ["CPF_LOOSE"],
      "t0ken",
    );

    const headers = requestInitFrom(mock).headers as Record<string, string>;
    expect(headers).toEqual({ Authorization: "Bearer t0ken" });
    expect(headers).not.toHaveProperty("Content-Type");
  });

  it("posts to the file sub-resource, not the plain text endpoint", async () => {
    const mock = stubFetchReturning(EMPTY_GRAPH);
    await ingestFile(
      new File([new Uint8Array(8)], "sheet.csv"),
      ["CPF_LOOSE"],
      "t0ken",
    );

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/text-ingestion\/file$/);
  });
});
