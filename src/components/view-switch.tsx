"use client";

import { AlertTriangle, Network, Table2 } from "lucide-react";
import { evaluateFindings } from "@/lib/findings";
import { useOverlay } from "@/hooks/use-overlay";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useViewStore } from "@/store/view";
import type { WhiteboardView } from "@/store/view";

const VIEWS = new Set<WhiteboardView>(["graph", "table", "findings"]);

export function ViewSwitch() {
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);
  const overlay = useOverlay();
  const findings = evaluateFindings(overlay);
  const highSeverityCount = findings.filter((f) => f.severity === "alto").length;

  return (
    <ToggleGroup
      className="flex overflow-hidden rounded-md border border-border bg-surface-2"
      orientation="horizontal"
      spacing={0}
      value={[view]}
      onValueChange={(value: string[]) => {
        const next = value[0];
        if (next !== undefined && VIEWS.has(next as WhiteboardView)) {
          setView(next as WhiteboardView);
        }
      }}
    >
      <ToggleGroupItem
        value="graph"
        aria-label="Visualizar em grafo"
        title="Grafo"
        className="size-8 border-border border-r data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Network size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="table"
        aria-label="Visualizar em tabela"
        title="Tabela"
        className="size-8 border-border border-r data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Table2 size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="findings"
        aria-label="Visualizar achados"
        title="Achados"
        className="relative size-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <AlertTriangle size={14} />
        {findings.length > 0 ? (
          <span
            className={cn(
              "absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold",
              highSeverityCount > 0
                ? "bg-destructive text-white"
                : "bg-warning text-warning-foreground",
            )}
          >
            {findings.length > 9 ? "9+" : findings.length}
          </span>
        ) : null}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
