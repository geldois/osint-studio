import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiSchemaError } from "@/lib/api";
import { translateError, UNKNOWN_ERROR_MESSAGE } from "@/lib/errors";

function makeZodError(): z.ZodError {
  const result = z.object({ id: z.string() }).safeParse({});
  if (result.success) {
    throw new Error("expected safeParse to fail");
  }
  return result.error;
}

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
