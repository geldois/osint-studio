"use client";

import { Network, Table2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useViewStore } from "@/store/view";

export function ViewSwitch() {
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);

  return (
    <ToggleGroup
      className="flex overflow-hidden rounded-md border border-border bg-surface-2"
      orientation="horizontal"
      spacing={0}
      value={[view]}
      onValueChange={(value: string[]) => {
        const next = value[0];
        if (next === "graph" || next === "table") {
          setView(next);
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
        className="size-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Table2 size={14} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
