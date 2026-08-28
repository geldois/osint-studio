"use client";

import { useQueries } from "@tanstack/react-query";
import { Info, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityIcon } from "@/components/nodes/entity-icon";
import { FilterChips } from "@/components/filter-chips";
import { Input } from "@/components/ui/input";
import { Flyout } from "@/components/flyout";
import { useGraphCatalog } from "@/hooks/use-graph-catalog";
import { useOverlay } from "@/hooks/use-overlay";
import { fetchGraphHistory } from "@/lib/api";
import { extractLabel } from "@/lib/graph-adapter";
import { formatFetchedAt } from "@/lib/overlay";
import { nodeTypeAccentBorder } from "@/lib/relationships";
import { itemsForTypeFilter, typeFilterOptionsFor } from "@/lib/table";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useConflictFilterStore } from "@/store/conflict-filter";
import { useGraphStore } from "@/store/graph";
import type { GraphCatalogEntry, NodeType } from "@/types/api";

export function GraphInfoButton() {
  const overlay = useOverlay();
  const conflictFilterActive = useConflictFilterStore((s) => s.active);
  const toggleConflictFilter = useConflictFilterStore((s) => s.toggle);

  const token = useAuthStore((s) => s.token);
  const selected = useGraphStore((s) => s.selected);
  const selectRevisions = useGraphStore((s) => s.selectRevisions);
  const receiveHistory = useGraphStore((s) => s.receiveHistory);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<NodeType[]>([]);

  const { data: catalog } = useGraphCatalog();
  const entries = useMemo(() => catalog?.entries ?? [], [catalog]);

  const historyQueries = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ["graph-history", "graph-info-button", entry.root.id],
      queryFn: async () => {
        if (token === null) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        const history = await fetchGraphHistory(entry.root.id, token);
        receiveHistory(entry.root.id, history);
        return history;
      },
      enabled: open && token !== null,
    })),
  });

  const typeOptions = useMemo(
    () => typeFilterOptionsFor(entries, (entry) => entry.root.type),
    [entries],
  );

  if (entries.length === 0) {
    return null;
  }

  const allContentIds = historyQueries.flatMap(
    (query) => query.data?.map((schema) => schema.content_id) ?? [],
  );
  const conflictCount =
    Object.keys(overlay.conflicts.nodes).length +
    Object.keys(overlay.conflicts.edges).length;
  const summary = `${String(overlay.roots.size)} grafo${overlay.roots.size === 1 ? "" : "s"} sobreposto${overlay.roots.size === 1 ? "" : "s"} · ${String(overlay.nodes.length)} nós · ${String(overlay.edges.length)} arestas`;

  const filteredByType = itemsForTypeFilter(
    entries,
    (entry) => entry.root.type,
    selectedTypes,
  );
  const needle = filter.trim().toLowerCase();
  const visibleEntries: GraphCatalogEntry[] =
    needle === ""
      ? filteredByType
      : filteredByType.filter((entry) =>
          extractLabel(entry.root).toLowerCase().includes(needle),
        );

  return (
    <Flyout
      open={open}
      onOpenChange={setOpen}
      title="Informações do grafo"
      trigger={
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Informações do grafo"
          title={summary}
          className="size-8 rounded-md aria-expanded:bg-primary/15 aria-expanded:text-primary"
        >
          <Info size={14} />
        </Button>
      }
    >
      <div className="flex items-center gap-2 border-border border-b p-2.5 text-[11px] text-muted">
        <span>
          {overlay.roots.size} grafo{overlay.roots.size === 1 ? "" : "s"} sobreposto
          {overlay.roots.size === 1 ? "" : "s"}
        </span>
        <span>{overlay.nodes.length} nós</span>
        <span>{overlay.edges.length} arestas</span>
        {conflictCount > 0 ? (
          <button
            type="button"
            onClick={toggleConflictFilter}
            className={`ml-auto rounded-md px-1.5 py-0.5 transition-colors ${
              conflictFilterActive
                ? "bg-amber-500/20 text-amber-500"
                : "hover:text-foreground"
            }`}
          >
            {conflictCount} conflito{conflictCount === 1 ? "" : "s"}
          </button>
        ) : null}
      </div>

      <div className="space-y-2 border-border border-b p-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
          />
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
            }}
            placeholder="Filtrar grafos..."
            className="pl-7"
          />
        </div>
        <FilterChips
          options={typeOptions}
          selected={selectedTypes}
          onChange={(next) => {
            setSelectedTypes(next as NodeType[]);
          }}
        />
      </div>

      <div className="max-h-72 space-y-1.5 overflow-auto p-1.5">
        {entries.length === 0 ? (
          <p className="p-2 text-[12px] text-muted">Nenhum grafo buscado ainda.</p>
        ) : visibleEntries.length === 0 ? (
          <p className="p-2 text-[12px] text-muted">
            Nenhum grafo corresponde ao filtro.
          </p>
        ) : (
          visibleEntries.map((entry) => {
            const index = entries.indexOf(entry);
            const history = historyQueries[index]?.data ?? [];
            const rootContentIds = history.map((schema) => schema.content_id);
            const allRootSelected =
              rootContentIds.length > 0 &&
              rootContentIds.every((contentId) => selected.includes(contentId));

            return (
              <div
                key={entry.root.id}
                className={cn(
                  "rounded-lg border-2 bg-surface-2 p-2",
                  nodeTypeAccentBorder(entry.root.type),
                )}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 opacity-70">
                      <EntityIcon nodeType={entry.root.type} size={13} />
                    </span>
                    <span className="truncate font-medium text-[12px]">
                      {extractLabel(entry.root)}
                    </span>
                  </span>
                  <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted">
                    <Checkbox
                      checked={allRootSelected}
                      onCheckedChange={(checked) => {
                        const withoutRoot = selected.filter(
                          (contentId) => !rootContentIds.includes(contentId),
                        );
                        selectRevisions(
                          checked ? [...withoutRoot, ...rootContentIds] : withoutRoot,
                        );
                      }}
                    />
                    todas ({entry.revision_count})
                  </label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {history.map((revision) => {
                    const isSelected = selected.includes(revision.content_id);
                    return (
                      <button
                        key={revision.content_id}
                        type="button"
                        onClick={() => {
                          selectRevisions(
                            isSelected
                              ? selected.filter((id) => id !== revision.content_id)
                              : [...selected, revision.content_id],
                          );
                        }}
                        className={cn(
                          "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] transition-colors",
                          isSelected
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-surface text-muted hover:bg-white/5",
                        )}
                      >
                        {formatFetchedAt(revision.revision.fetched_at)}
                        <span className="opacity-70">
                          · {revision.revision.provider}
                        </span>
                        {revision.revision.merged_at !== null ? (
                          <span className="rounded-sm bg-white/10 px-1 text-[9px] uppercase">
                            mesclado
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-border border-t p-2">
        <span className="text-[11px] text-muted">{selected.length} selecionada(s)</span>
        <label className="flex items-center gap-1.5 text-[11px]">
          <Checkbox
            checked={
              allContentIds.length > 0 && selected.length === allContentIds.length
            }
            onCheckedChange={(checked) => {
              selectRevisions(checked ? allContentIds : []);
            }}
          />
          tudo
        </label>
      </div>
    </Flyout>
  );
}
