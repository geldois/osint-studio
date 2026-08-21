import { useQuery } from "@tanstack/react-query";
import { fetchTextPatternCatalog } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { TextPatternCatalog } from "@/types/api";

export function useTextPatternCatalog() {
  const token = useAuthStore((s) => s.token);
  return useQuery<TextPatternCatalog>({
    queryKey: ["text-pattern-catalog"],
    queryFn: () => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchTextPatternCatalog(token);
    },
    enabled: token !== null,
  });
}
