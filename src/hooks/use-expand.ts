import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCEAF,
  fetchCEIS,
  fetchCEPIM,
  fetchCNEP,
  fetchGraph,
  fetchGraphByCpf,
  fetchLegalProcess,
  fetchPEP,
} from "@/lib/api";
import { isCpf } from "@/lib/document";
import type { ExpansionRouteKey } from "@/lib/expansion-routes";
import { canFetchDocumentType } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import type { GraphSchema } from "@/types/api";

interface ExpandVars {
  document: string;
  routes: ExpansionRouteKey[];
  force?: boolean;
}

interface ExpandResult {
  errors: unknown[];
  focusNodeId: string | null;
  schemas: GraphSchema[];
}

function fetchForRoute(
  route: ExpansionRouteKey,
  document: string,
  documentIsCpf: boolean,
  token: string,
  force: boolean,
): Promise<GraphSchema | null> {
  switch (route) {
    case "root":
      return documentIsCpf
        ? fetchGraphByCpf(document, token, force)
        : fetchGraph(document, token);
    case "cnep":
      return fetchCNEP(document, token);
    case "ceis":
      return fetchCEIS(document, token);
    case "ceaf":
      return fetchCEAF(document, token);
    case "cepim":
      return fetchCEPIM(document, token);
    case "pep":
      return fetchPEP(document, token);
    case "legal_process":
      return fetchLegalProcess(document, token);
  }
}

export function useExpand() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const receiveGraph = useGraphStore((s) => s.receiveGraph);
  const setFocusNode = useGraphStore((s) => s.setFocusNode);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      document,
      routes,
      force = false,
    }: ExpandVars): Promise<ExpandResult> => {
      if (token === null) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const documentIsCpf = isCpf(document);
      if (!canFetchDocumentType(role, documentIsCpf ? "cpf" : "cnpj")) {
        throw new Error("Sua conta não tem permissão para esta ação.");
      }

      const results = await Promise.allSettled(
        routes.map((route) =>
          fetchForRoute(route, document, documentIsCpf, token, force),
        ),
      );

      const schemas = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((schema): schema is GraphSchema => schema !== null);

      const errors = results
        .filter(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        )
        .map((result): unknown => result.reason as unknown);

      const focusNodeId = schemas[0]?.root_id ?? null;

      return { errors, focusNodeId, schemas };
    },
    onSuccess: ({ schemas, focusNodeId }) => {
      for (const schema of schemas) {
        receiveGraph(schema);
      }
      if (focusNodeId !== null) {
        setFocusNode(focusNodeId);
      }
      if (schemas.length > 0) {
        void queryClient.invalidateQueries({ queryKey: ["graph-catalog"] });
      }
    },
  });
}
