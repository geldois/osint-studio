"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { fetchGraphCatalog, fetchGraphHistory } from "@/lib/api";
import { pruneSelection } from "@/lib/overlay";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";

export function useHydrateGraphSelection(): void {
  const token = useAuthStore((s) => s.token);
  const authHydrated = useAuthStore((s) => s.hasHydrated);
  const graphHydrated = useGraphStore((s) => s.hasHydrated);
  const selected = useGraphStore((s) => s.selected);
  const receiveHistory = useGraphStore((s) => s.receiveHistory);
  const selectRevisions = useGraphStore((s) => s.selectRevisions);

  const prunedOnce = useRef(false);
  const ready =
    authHydrated &&
    graphHydrated &&
    token !== null &&
    !prunedOnce.current &&
    selected.length > 0;

  const catalogQuery = useQuery({
    queryKey: ["graph-catalog", "hydration"],
    queryFn: () => fetchGraphCatalog(token ?? ""),
    enabled: ready,
  });

  const everyCatalogRootId = useMemo(
    () => catalogQuery.data?.entries.map((entry) => entry.root.id) ?? [],
    [catalogQuery.data],
  );

  const historyQueries = useQueries({
    queries: everyCatalogRootId.map((rootId) => ({
      queryKey: ["graph-history", "hydration", rootId],
      queryFn: () => fetchGraphHistory(rootId, token ?? ""),
      enabled: ready,
    })),
  });

  const catalogSettled = !ready || catalogQuery.isSuccess || catalogQuery.isError;
  const historiesSettled = historyQueries.every(
    (query) => query.isSuccess || query.isError,
  );

  useEffect(() => {
    if (!ready || prunedOnce.current || !catalogSettled || !historiesSettled) {
      return;
    }
    prunedOnce.current = true;

    const available = new Set<string>();
    everyCatalogRootId.forEach((rootId, index) => {
      const data = historyQueries[index]?.data;
      if (data !== undefined) {
        receiveHistory(rootId, data);
        for (const schema of data) {
          available.add(schema.content_id);
        }
      }
    });
    selectRevisions(pruneSelection(selected, available));
  }, [ready, catalogSettled, historiesSettled]);
}
