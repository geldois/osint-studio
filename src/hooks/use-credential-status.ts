import { useQuery } from "@tanstack/react-query";
import { fetchCredentialStatus } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { CredentialStatus } from "@/types/api";

export function useCredentialStatus() {
  const token = useAuthStore((s) => s.token);
  return useQuery<CredentialStatus[]>({
    queryKey: ["credential-status"],
    queryFn: () => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchCredentialStatus(token);
    },
    enabled: token !== null,
  });
}
