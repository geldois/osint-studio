"use client";

import { AlertTriangle } from "lucide-react";
import { FindingCard } from "@/components/findings/findings-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOverlay } from "@/hooks/use-overlay";
import { evaluateFindings } from "@/lib/findings";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";

export function EntityFindings({ entityIds }: { entityIds: string[] }) {
  const overlay = useOverlay();
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const findings = evaluateFindings(overlay).filter((finding) =>
    finding.nodeIds.some((id) => entityIds.includes(id)),
  );
  const selectNode = useSelectionStore((s) => s.selectNode);
  const setFocusNode = useGraphStore((s) => s.setFocusNode);

  function jumpTo(nodeId: string): void {
    setFocusNode(nodeId);
    selectNode(nodeId);
  }

  if (findings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <AlertTriangle size={24} className="text-muted" />
        <p className="text-[12px] text-muted">Nenhum achado envolve esta entidade.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <ul className="space-y-2 p-3">
        {findings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            nodeById={nodeById}
            onJumpTo={jumpTo}
          />
        ))}
      </ul>
    </ScrollArea>
  );
}
