"use client";

import { Network, Table2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useViewStore } from "@/store/view";

export function ViewSwitch() {
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);

  return (
    <ToggleGroup
      className="absolute right-3 bottom-3 z-10 flex-col overflow-hidden rounded-sm border border-border bg-surface shadow-lg md:top-3 md:bottom-auto"
      orientation="vertical"
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
        className="size-10 rounded-none border-border border-b sm:size-8"
      >
        <Network size={15} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="table"
        aria-label="Visualizar em tabela"
        title="Tabela"
        className="size-10 rounded-none sm:size-8"
      >
        <Table2 size={15} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
