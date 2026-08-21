import { describe, expect, it } from "vitest";
import { batchCost, formatCostBRL, KIPFLOW_CPF_COST_BRL } from "@/lib/pricing";
import type { BatchCPFEstimate } from "@/types/api";

describe("formatCostBRL", () => {
  it("formats the known per-expansion cost as pt-BR currency", () => {
    expect(formatCostBRL(KIPFLOW_CPF_COST_BRL)).toBe("R$ 0,19");
  });
});

describe("batchCost", () => {
  it("totals the billable count times the unit cost", () => {
    const estimate: BatchCPFEstimate = {
      already_fetched: [],
      billable: ["111", "222", "333"],
      invalid: [],
      wait_seconds: 0,
    };
    const result = batchCost(estimate);
    expect(result.billableCount).toBe(3);
    expect(result.totalBRL).toBeCloseTo(3 * KIPFLOW_CPF_COST_BRL);
  });

  it("is zero when everything was already fetched", () => {
    const estimate: BatchCPFEstimate = {
      already_fetched: ["111", "222"],
      billable: [],
      invalid: [],
      wait_seconds: 0,
    };
    const result = batchCost(estimate);
    expect(result.billableCount).toBe(0);
    expect(result.totalBRL).toBe(0);
  });

  it("rounds a repeating decimal like currency instead of exposing floating point", () => {
    const estimate: BatchCPFEstimate = {
      already_fetched: [],
      billable: Array.from({ length: 7 }, (_, i) => `cpf-${String(i)}`),
      invalid: [],
      wait_seconds: 0,
    };
    const result = batchCost(estimate);
    expect(formatCostBRL(result.totalBRL)).toBe("R$ 1,33");
  });
});
