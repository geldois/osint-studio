import { useQuery } from "@tanstack/react-query";
import { fetchCredentialStatus } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { CredentialStatus } from "@/types/api";

export function useCredentialStatus() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  return useQuery<CredentialStatus[]>({
    queryKey: ["credential-status"],
    queryFn: () => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchCredentialStatus(token);
    },
    // Credentials are Portal da Transparência API keys, an admin-only
    // resource (osint-engine's credentials_router) — visitors have no use
    // for this and the backend would just 403 the request.
    enabled: token !== null && role === "ADMIN",
  });
}
