import { useQuery } from "@tanstack/react-query";
import { fetchTextPatternSets } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { TextPatternSet } from "@/types/api";

export function useTextPatternSets() {
  const token = useAuthStore((s) => s.token);
  return useQuery<TextPatternSet[]>({
    queryKey: ["text-pattern-sets"],
    queryFn: () => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchTextPatternSets(token);
    },
    enabled: token !== null,
  });
}
