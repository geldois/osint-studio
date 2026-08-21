import type { BatchCPFEstimate } from "@/types/api";

export const KIPFLOW_CPF_COST_BRL = 0.19;

export function formatCostBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface BatchCost {
  alreadyFetchedCount: number;
  billableCount: number;
  invalidCount: number;
  totalBRL: number;
}

export function batchCost(estimate: BatchCPFEstimate): BatchCost {
  return {
    alreadyFetchedCount: estimate.already_fetched.length,
    billableCount: estimate.billable.length,
    invalidCount: estimate.invalid.length,
    totalBRL: estimate.billable.length * KIPFLOW_CPF_COST_BRL,
  };
}
