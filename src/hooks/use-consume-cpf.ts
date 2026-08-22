import { useMemo } from "react";
import { useBatchEstimate, useBatchExpand } from "@/hooks/use-batch-expand";
import { useGraphStore } from "@/store/graph";

export function useConsumeCpf(cpf: string | null) {
  const cpfs = useMemo(() => (cpf !== null ? [cpf] : []), [cpf]);
  const estimateQuery = useBatchEstimate(cpfs);
  const batchExpand = useBatchExpand();
  const setFocusNode = useGraphStore((s) => s.setFocusNode);

  function consume(force: boolean): void {
    if (cpf === null) {
      return;
    }
    batchExpand.mutate(
      { cpfs, force },
      {
        onSuccess: (result) => {
          const focusNode = result.graph?.nodes.find(
            (node) => node.type === "person" && node.cpf === cpf,
          );
          if (focusNode !== undefined) {
            setFocusNode(focusNode.id);
          }
        },
      },
    );
  }

  return {
    estimate: estimateQuery.data,
    estimateLoading: estimateQuery.isLoading,
    isPending: batchExpand.isPending,
    error: batchExpand.error,
    data: batchExpand.data,
    consume,
  };
}
