import { useMutation } from "@tanstack/react-query";
import { ingestText } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";
import type { GraphSchema } from "@/types/api";

interface IngestTextVars {
  text: string;
  patternSetId: string;
}

export function useIngestText() {
  const token = useAuthStore((s) => s.token);
  const mergeGraph = useGraphStore((s) => s.mergeGraph);
  const selectNode = useSelectionStore((s) => s.selectNode);

  return useMutation({
    mutationFn: ({ text, patternSetId }: IngestTextVars): Promise<GraphSchema> => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return ingestText(text, patternSetId, token);
    },
    onSuccess: (schema) => {
      mergeGraph(schema);
      selectNode(schema.root_id);
    },
  });
}
