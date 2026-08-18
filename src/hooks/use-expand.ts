import { useMutation } from "@tanstack/react-query";
import { fetchCEIS, fetchCNEP, fetchGraph, fetchGraphByCpf } from "@/lib/api";
import { isCpf } from "@/lib/document";
import { canFetchDocumentType } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import type { GraphSchema } from "@/types/api";

interface ExpandVars {
  document: string;
}

interface ExpandResult {
  errors: unknown[];
  schemas: GraphSchema[];
}

export function useExpand() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const mergeGraph = useGraphStore((s) => s.mergeGraph);

  return useMutation({
    mutationFn: async ({ document }: ExpandVars): Promise<ExpandResult> => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const documentIsCpf = isCpf(document);
      if (!canFetchDocumentType(role, documentIsCpf ? "cpf" : "cnpj")) {
        throw new Error("Sua conta não tem permissão para esta ação.");
      }

      const fetchRootGraph = documentIsCpf ? fetchGraphByCpf : fetchGraph;

      // CNEP/CEIS are sourced from the Portal da Transparência, which
      // requires a caller-supplied API key restricted to admins — visitors
      // only consume the anonymous BrasilAPI-backed root graph.
      const fetches =
        role === "ADMIN"
          ? [
              fetchRootGraph(document, token),
              fetchCNEP(document, token),
              fetchCEIS(document, token),
            ]
          : [fetchRootGraph(document, token)];

      const results = await Promise.allSettled(fetches);

      const schemas = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((schema): schema is GraphSchema => schema !== null);

      const errors = results
        .filter(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        )
        .map((result): unknown => result.reason as unknown);

      return { errors, schemas };
    },
    onSuccess: ({ schemas }) => {
      for (const schema of schemas) {
        mergeGraph(schema);
      }
    },
  });
}
