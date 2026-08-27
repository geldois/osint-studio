import { useQuery } from "@tanstack/react-query";
import { fetchEntityRecordsByCpf } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { EntityRecord } from "@/types/api";

export function useConsumptionHistory(cpf: string | null) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  return useQuery<EntityRecord[]>({
    queryKey: ["consumption-history", cpf],
    queryFn: () => {
      if (token === null || cpf === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchEntityRecordsByCpf(cpf, token);
    },
    enabled: token !== null && cpf !== null && role === "ADMIN",
  });
}
