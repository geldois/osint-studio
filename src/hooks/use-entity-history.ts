import { useQuery } from "@tanstack/react-query";
import { fetchEdgeHistory, fetchNodeHistory } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { ApiEdge, ApiNode } from "@/types/api";

export function useNodeHistory(nodeId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery<ApiNode[]>({
    queryKey: ["node-history", nodeId],
    queryFn: () => {
      if (token === null || nodeId === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchNodeHistory(nodeId, token);
    },
    enabled: token !== null && nodeId !== null,
  });
}

export function useEdgeHistory(edgeId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery<ApiEdge[]>({
    queryKey: ["edge-history", edgeId],
    queryFn: () => {
      if (token === null || edgeId === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchEdgeHistory(edgeId, token);
    },
    enabled: token !== null && edgeId !== null,
  });
}
