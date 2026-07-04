import { useMutation } from "@tanstack/react-query";
import { fetchGraph } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";

interface ExpandVars {
  cnpj: string;
  anchorId: string | null;
}

export function useExpand() {
  const token = useAuthStore((s) => s.token);
  const mergeGraph = useGraphStore((s) => s.mergeGraph);

  return useMutation({
    mutationFn: async ({ cnpj }: ExpandVars) => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return fetchGraph(cnpj, token);
    },
    onSuccess: (schema, { anchorId }) => {
      mergeGraph(schema, anchorId);
    },
  });
}
