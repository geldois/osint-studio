"use client";

import { AlertTriangle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EntityIcon } from "@/components/nodes/entity-icon";
import { SeverityBadge } from "@/components/findings/severity-badge";
import {
  GroupedFilterChips,
  GroupedFilterChipsTags,
} from "@/components/grouped-filter-chips";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOverlay } from "@/hooks/use-overlay";
import {
  categoryLabel,
  evaluateFindings,
  severityLabel,
  type Finding,
  type FindingCategory,
  type FindingSeverity,
} from "@/lib/findings";
import { extractLabel } from "@/lib/graph-adapter";
import { nodeTypeAccentBorder } from "@/lib/relationships";
import { itemsMatchingSelection } from "@/lib/table";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";
import type { ApiNode } from "@/types/api";

const SEVERITY_ORDER = ["alto", "medio", "baixo"] as const;

export function FindingCard({
  finding,
  nodeById,
  onJumpTo,
}: {
  finding: Finding;
  nodeById: Map<string, ApiNode>;
  onJumpTo: (nodeId: string) => void;
}) {
  const entities = finding.nodeIds
    .map((id) => nodeById.get(id))
    .filter((node): node is ApiNode => node !== undefined);

  return (
    <li className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="font-medium text-[13px] leading-snug">{finding.title}</span>
        <SeverityBadge severity={finding.severity} />
      </div>
      <div className="mb-2 text-[10px] text-muted uppercase tracking-wide">
        {categoryLabel(finding.category)}
      </div>
      <p className="mb-2.5 text-[12px] text-muted">{finding.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {entities.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => {
              onJumpTo(node.id);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-md border-2 bg-surface px-2 py-1 text-[11px] hover:bg-foreground/5",
              nodeTypeAccentBorder(node.type),
            )}
          >
            <EntityIcon nodeType={node.type} size={12} />
            <span className="max-w-40 truncate">{extractLabel(node)}</span>
          </button>
        ))}
      </div>
    </li>
  );
}

export function FindingsPanel() {
  const overlay = useOverlay();
  const findings = useMemo(() => evaluateFindings(overlay), [overlay]);
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));

  const [selectedSeverities, setSelectedSeverities] = useState<FindingSeverity[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<FindingCategory[]>([]);
  const [filter, setFilter] = useState("");

  const selectNode = useSelectionStore((s) => s.selectNode);
  const setFocusNode = useGraphStore((s) => s.setFocusNode);

  function jumpTo(nodeId: string): void {
    setFocusNode(nodeId);
    selectNode(nodeId);
  }

  const severityOptions = useMemo(() => {
    const counts = new Map<FindingSeverity, number>();
    for (const finding of findings) {
      counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1);
    }
    return SEVERITY_ORDER.filter((severity) => counts.has(severity)).map(
      (severity) => ({
        count: counts.get(severity) ?? 0,
        label: severityLabel(severity),
        value: severity,
      }),
    );
  }, [findings]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<FindingCategory, number>();
    for (const finding of findings) {
      counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ count, label: categoryLabel(value), value }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [findings]);

  const bySeverity = itemsMatchingSelection(
    findings,
    (finding) => finding.severity,
    selectedSeverities,
  );
  const byCategory = itemsMatchingSelection(
    bySeverity,
    (finding) => finding.category,
    selectedCategories,
  );
  const needle = filter.trim().toLowerCase();
  const visible =
    needle === ""
      ? byCategory
      : byCategory.filter((finding) =>
          `${finding.title} ${finding.description}`.toLowerCase().includes(needle),
        );

  if (findings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <AlertTriangle size={28} className="text-muted" />
        <p className="max-w-72 text-muted text-sm">
          Nenhum achado neste grafo — nenhuma sanção, conflito de interesse ou
          inconsistência detectada entre as entidades carregadas até agora.
        </p>
      </div>
    );
  }

  const findingFilterGroups = [
    {
      title: "Severidade",
      options: severityOptions,
      selected: selectedSeverities,
      onChange: (next: string[]) => {
        setSelectedSeverities(next as FindingSeverity[]);
      },
    },
    {
      title: "Categoria",
      options: categoryOptions,
      selected: selectedCategories,
      onChange: (next: string[]) => {
        setSelectedCategories(next as FindingCategory[]);
      },
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
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
            placeholder="Filtrar achados..."
            className="pl-7"
          />
        </div>
        <GroupedFilterChips groups={findingFilterGroups} />
        <GroupedFilterChipsTags groups={findingFilterGroups} />
        {visible.length === 0 ? (
          <p className="p-3 text-[12px] text-muted">
            Nenhum achado corresponde ao filtro.
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                nodeById={nodeById}
                onJumpTo={jumpTo}
              />
            ))}
          </ul>
        )}
      </div>
    </ScrollArea>
  );
}
