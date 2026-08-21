import { describe, expect, it } from "vitest";
import { isConsumableCpf, isCpf, isMaskedCpf } from "@/lib/document";

describe("isMaskedCpf", () => {
  it("is true for a masked CPF", () => {
    expect(isMaskedCpf("***444777**")).toBe(true);
  });

  it("is false for a full digit CPF", () => {
    expect(isMaskedCpf("11144477735")).toBe(false);
  });

  it("is true when the mask sits in the middle", () => {
    expect(isMaskedCpf("111***77735")).toBe(true);
  });

  it("is true when the mask sits at the edges", () => {
    expect(isMaskedCpf("***44477735")).toBe(true);
  });

  it("is false for an empty string", () => {
    expect(isMaskedCpf("")).toBe(false);
  });
});

describe("isConsumableCpf", () => {
  it("is true only for an 11-digit value without a mask", () => {
    expect(isConsumableCpf("11144477735")).toBe(true);
  });

  it("is false for a masked value", () => {
    expect(isConsumableCpf("***444777**")).toBe(false);
  });

  it("is false for an empty string", () => {
    expect(isConsumableCpf("")).toBe(false);
  });

  it("is false for a 14-digit CNPJ", () => {
    expect(isConsumableCpf("00000000000191")).toBe(false);
  });
});

describe("isCpf", () => {
  it("counts digits after stripping punctuation", () => {
    expect(isCpf("111.444.777-35")).toBe(true);
  });

  it("rejects a CNPJ-length value", () => {
    expect(isCpf("00.000.000/0001-91")).toBe(false);
  });
});
