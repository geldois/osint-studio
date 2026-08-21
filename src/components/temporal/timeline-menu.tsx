"use client";

import { useQueries } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGraphCatalog } from "@/hooks/use-graph-catalog";
import { fetchGraphHistory } from "@/lib/api";
import { extractLabel } from "@/lib/graph-adapter";
import { formatFetchedAt } from "@/lib/overlay";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";

export function TimelineMenu() {
  const token = useAuthStore((s) => s.token);
  const selected = useGraphStore((s) => s.selected);
  const selectRevisions = useGraphStore((s) => s.selectRevisions);
  const receiveHistory = useGraphStore((s) => s.receiveHistory);
  const [open, setOpen] = useState(false);

  const { data: catalog } = useGraphCatalog();
  const entries = catalog?.entries ?? [];

  const historyQueries = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ["graph-history", "timeline-menu", entry.root.id],
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

  const allContentIds = historyQueries.flatMap(
    (query) => query.data?.map((schema) => schema.content_id) ?? [],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Navegação temporal"
        title="Navegação temporal"
        className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-foreground hover:bg-white/10 sm:size-8"
      >
        <History size={16} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-border border-b p-2.5">
          <span className="text-[11px] text-muted uppercase tracking-wide">
            Grafos ({entries.length})
          </span>
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
        <ScrollArea className="max-h-96">
          {entries.length === 0 ? (
            <p className="p-3 text-[12px] text-muted">Nenhum grafo buscado ainda.</p>
          ) : (
            entries.map((entry, index) => {
              const history = historyQueries[index]?.data ?? [];
              const rootContentIds = history.map((schema) => schema.content_id);
              const allRootSelected =
                rootContentIds.length > 0 &&
                rootContentIds.every((contentId) => selected.includes(contentId));

              return (
                <div key={entry.root.id} className="border-border border-b p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-[12px]">
                      {extractLabel(entry.root)}
                    </span>
                    <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
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
                      todas
                    </label>
                  </div>
                  <ul className="space-y-1">
                    {history.map((revision) => (
                      <li
                        key={revision.content_id}
                        className="flex items-center gap-1.5 text-[11px]"
                      >
                        <Checkbox
                          checked={selected.includes(revision.content_id)}
                          onCheckedChange={(checked) => {
                            selectRevisions(
                              checked
                                ? [...selected, revision.content_id]
                                : selected.filter((id) => id !== revision.content_id),
                            );
                          }}
                        />
                        <span className="text-muted">
                          {formatFetchedAt(revision.revision.fetched_at)}
                        </span>
                        <span>{revision.revision.provider}</span>
                        {revision.revision.merged_at !== null ? (
                          <span className="ml-auto shrink-0 rounded-sm bg-white/10 px-1 text-[9px] uppercase">
                            mesclado
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
