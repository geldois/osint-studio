import { useQuery } from "@tanstack/react-query";
import { fetchGraphHistory } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import type { GraphSchema } from "@/types/api";

export function useGraphHistory(rootId: string | null) {
  const token = useAuthStore((s) => s.token);
  const receiveHistory = useGraphStore((s) => s.receiveHistory);
  return useQuery<GraphSchema[]>({
    queryKey: ["graph-history", rootId],
    queryFn: async () => {
      if (token === null || rootId === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      const history = await fetchGraphHistory(rootId, token);
      receiveHistory(rootId, history);
      return history;
    },
    enabled: token !== null && rootId !== null,
  });
}
