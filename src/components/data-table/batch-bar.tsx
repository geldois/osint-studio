"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBatchEstimate, useBatchExpand } from "@/hooks/use-batch-expand";
import { translateError } from "@/lib/errors";
import {
  BATCH_CPF_OUTCOME_LABELS,
  formatCostBRL,
  KIPFLOW_CPF_COST_BRL,
} from "@/lib/pricing";
import { consumableSelection } from "@/lib/table";
import { useTableSelectionStore } from "@/store/table-selection";
import type { ApiNode } from "@/types/api";

export function BatchBar({ nodes }: { nodes: ApiNode[] }) {
  const selectedIds = useTableSelectionStore((s) => s.selectedIds);
  const clear = useTableSelectionStore((s) => s.clear);
  const [force, setForce] = useState(false);

  const { cpfs, skippedIds } = useMemo(
    () => consumableSelection(nodes, selectedIds),
    [nodes, selectedIds],
  );

  const estimateQuery = useBatchEstimate(cpfs);
  const batchExpand = useBatchExpand();

  if (selectedIds.size === 0) {
    return null;
  }

  const estimate = estimateQuery.data;
  const alreadyFetchedCount = estimate?.already_fetched.length ?? 0;
  const estimateReady = cpfs.length === 0 || estimate !== undefined;
  const billableCount = force ? cpfs.length : (estimate?.billable.length ?? 0);
  const totalBRL = billableCount * KIPFLOW_CPF_COST_BRL;

  return (
    <div className="space-y-2 border-border border-b bg-surface px-3 py-2 text-[12px] print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {selectedIds.size} selecionado{selectedIds.size === 1 ? "" : "s"}
        </span>
        <span className="text-muted">
          {cpfs.length} {cpfs.length === 1 ? "consultável" : "consultáveis"}
          {skippedIds.length > 0 ? ` · ${String(skippedIds.length)} fora` : ""}
        </span>
        {alreadyFetchedCount > 0 ? (
          <label className="flex items-center gap-1.5 text-muted">
            <Checkbox
              checked={force}
              onCheckedChange={(checked) => {
                setForce(checked);
              }}
            />
            consultar de novo os já buscados ({alreadyFetchedCount})
          </label>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            Limpar seleção
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={cpfs.length === 0 || !estimateReady || batchExpand.isPending}
            onClick={() => {
              batchExpand.mutate({ cpfs, force });
            }}
          >
            {batchExpand.isPending
              ? "Consultando..."
              : `Consultar ${String(billableCount)} CPFs (${
                  estimateReady ? formatCostBRL(totalBRL) : "—"
                })`}
          </Button>
        </div>
      </div>

      {batchExpand.data ? (
        <p className="text-muted">
          {batchExpand.data.outcomes
            .map(
              (outcome) =>
                `${outcome.cpf}: ${BATCH_CPF_OUTCOME_LABELS[outcome.status]}`,
            )
            .join(" · ")}
        </p>
      ) : null}
      {batchExpand.error ? (
        <p className="text-red-500">{translateError(batchExpand.error)}</p>
      ) : null}
    </div>
  );
}
