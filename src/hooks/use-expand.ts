import { useMutation } from "@tanstack/react-query";
import { fetchCEIS, fetchCNEP, fetchGraph, fetchGraphByCpf } from "@/lib/api";
import { isCpf } from "@/lib/document";
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
  const mergeGraph = useGraphStore((s) => s.mergeGraph);

  return useMutation({
    mutationFn: async ({ document }: ExpandVars): Promise<ExpandResult> => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const fetchRootGraph = isCpf(document) ? fetchGraphByCpf : fetchGraph;

      const results = await Promise.allSettled([
        fetchRootGraph(document, token),
        fetchCNEP(document, token),
        fetchCEIS(document, token),
      ]);

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
