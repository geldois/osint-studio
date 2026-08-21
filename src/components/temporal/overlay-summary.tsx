"use client";

import { useOverlay } from "@/hooks/use-overlay";
import { useConflictFilterStore } from "@/store/conflict-filter";

export function OverlaySummary() {
  const overlay = useOverlay();
  const conflictFilterActive = useConflictFilterStore((s) => s.active);
  const toggleConflictFilter = useConflictFilterStore((s) => s.toggle);

  if (overlay.roots.size === 0) {
    return null;
  }

  const conflictCount =
    Object.keys(overlay.conflicts.nodes).length +
    Object.keys(overlay.conflicts.edges).length;

  return (
    <div className="flex items-center gap-3 border-border border-b bg-surface px-3 py-1.5 text-[11px] text-muted">
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
          className={`ml-auto rounded-sm px-1.5 py-0.5 transition-colors ${
            conflictFilterActive
              ? "bg-amber-500/20 text-amber-500"
              : "hover:text-foreground"
          }`}
        >
          {conflictCount} conflito{conflictCount === 1 ? "" : "s"}
        </button>
      ) : null}
    </div>
  );
}
