"use client";

import { Network, Table2 } from "lucide-react";
import { useViewStore } from "@/store/view";

export function ViewSwitch() {
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded border border-border bg-surface shadow-lg">
      <button
        type="button"
        onClick={() => {
          setView("graph");
        }}
        aria-label="Visualizar em grafo"
        aria-pressed={view === "graph"}
        title="Grafo"
        className={`flex h-8 w-8 items-center justify-center border-border border-b ${
          view === "graph" ? "bg-white/10" : "hover:bg-white/5"
        }`}
      >
        <Network size={15} />
      </button>
      <button
        type="button"
        onClick={() => {
          setView("table");
        }}
        aria-label="Visualizar em tabela"
        aria-pressed={view === "table"}
        title="Tabela"
        className={`flex h-8 w-8 items-center justify-center ${
          view === "table" ? "bg-white/10" : "hover:bg-white/5"
        }`}
      >
        <Table2 size={15} />
      </button>
    </div>
  );
}
