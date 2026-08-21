import { useQuery } from "@tanstack/react-query";
import { fetchGraphCatalog } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { GraphCatalog } from "@/types/api";

export function useGraphCatalog() {
  const token = useAuthStore((s) => s.token);
  return useQuery<GraphCatalog>({
    queryKey: ["graph-catalog"],
    queryFn: () => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchGraphCatalog(token);
    },
    enabled: token !== null,
  });
}
