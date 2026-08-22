import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ingestFile, ingestText } from "@/lib/api";
import { ingestKindFor } from "@/lib/ingest-schema";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";
import type { GraphSchema } from "@/types/api";

interface IngestVars {
  file: File;
  patterns: string[];
}

export function useIngest() {
  const token = useAuthStore((s) => s.token);
  const receiveGraph = useGraphStore((s) => s.receiveGraph);
  const setFocusNode = useGraphStore((s) => s.setFocusNode);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, patterns }: IngestVars): Promise<GraphSchema> => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      const kind = ingestKindFor(file);
      if (kind === null) {
        throw new Error("Formato não suportado. Use .txt, .csv ou .xlsx.");
      }
      return kind === "spreadsheet"
        ? ingestFile(file, patterns, token)
        : ingestText(await file.text(), patterns, token);
    },
    onSuccess: (schema) => {
      receiveGraph(schema);
      setFocusNode(schema.root_id);
      selectNode(schema.root_id);
      void queryClient.invalidateQueries({ queryKey: ["graph-catalog"] });
    },
  });
}
