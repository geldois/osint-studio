import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { estimateCpfBatch, expandCpfBatch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import type { BatchCPFEstimate, BatchCPFResult } from "@/types/api";

const BATCH_ESTIMATE_STALE_TIME_MS = 30_000;

export function useBatchEstimate(cpfs: string[]) {
  const token = useAuthStore((s) => s.token);
  const sortedCpfs = [...cpfs].sort();

  return useQuery<BatchCPFEstimate>({
    queryKey: ["cpf-batch-estimate", sortedCpfs],
    queryFn: () => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return estimateCpfBatch(sortedCpfs, token);
    },
    enabled: token !== null && cpfs.length > 0,
    staleTime: BATCH_ESTIMATE_STALE_TIME_MS,
  });
}

export function useBatchExpand() {
  const token = useAuthStore((s) => s.token);
  const receiveGraph = useGraphStore((s) => s.receiveGraph);
  const queryClient = useQueryClient();

  return useMutation<BatchCPFResult, Error, { cpfs: string[]; force: boolean }>({
    mutationFn: ({ cpfs, force }) => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return expandCpfBatch(cpfs, force, token);
    },
    onSuccess: (result) => {
      if (result.graph !== null) {
        receiveGraph(result.graph);
        void queryClient.invalidateQueries({ queryKey: ["graph-catalog"] });
      }
    },
  });
}
