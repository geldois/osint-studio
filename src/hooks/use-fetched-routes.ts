import { useMemo } from "react";
import { useGraphCatalog } from "@/hooks/use-graph-catalog";
import { fetchedRouteKeys, type ExpansionRouteKey } from "@/lib/expansion-routes";
import { findCatalogEntryForDocument } from "@/lib/graph-adapter";

export function useFetchedRoutes(document: string): {
  data: Set<ExpansionRouteKey> | undefined;
  isLoading: boolean;
} {
  const { data: catalog, isLoading } = useGraphCatalog();

  const data = useMemo(() => {
    if (catalog === undefined) {
      return undefined;
    }
    const entry = findCatalogEntryForDocument(document, catalog.entries);
    return entry === undefined
      ? new Set<ExpansionRouteKey>()
      : fetchedRouteKeys(entry.fetched_routes);
  }, [catalog, document]);

  return { data, isLoading };
}
