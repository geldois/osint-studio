import { useMutation } from "@tanstack/react-query";
import { fetchCEIS, fetchCNEP, fetchGraph } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import type { GraphSchema } from "@/types/api";

interface ExpandVars {
  cnpj: string;
  anchorId: string | null;
}

export function useExpand() {
  const token = useAuthStore((s) => s.token);
  const mergeGraph = useGraphStore((s) => s.mergeGraph);

  return useMutation({
    mutationFn: async ({ cnpj }: ExpandVars): Promise<GraphSchema[]> => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const results = await Promise.allSettled([
        fetchGraph(cnpj, token),
        fetchCNEP(cnpj, token),
        fetchCEIS(cnpj, token),
      ]);

      return results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((schema): schema is GraphSchema => schema !== null);
    },
    onSuccess: (schemas, { anchorId }) => {
      for (const schema of schemas) {
        mergeGraph(schema, anchorId);
      }
    },
  });
}
