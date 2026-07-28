"use client";

import { BaseEdge, type EdgeProps, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import { useSelectionStore } from "@/store/selection";

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const selectedEdgeId = useSelectionStore((s) => s.selectedEdgeId);
  const selectEdge = useSelectionStore((s) => s.selectEdge);
  const isSelected = selectedEdgeId === id;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} interactionWidth={0} className="!stroke-border" />
      <EdgeLabelRenderer>
        <button
          type="button"
          onClick={() => {
            selectEdge(id);
          }}
          aria-label="Ver atributos da relação"
          style={{
            transform: `translate(-50%, -50%) translate(${String(labelX)}px, ${String(labelY)}px)`,
          }}
          className={`nodrag nopan pointer-events-auto absolute h-3 w-3 rotate-45 rounded-[3px] border bg-surface transition-colors ${
            isSelected ? "border-white bg-white" : "border-border hover:border-foreground"
          }`}
        />
      </EdgeLabelRenderer>
    </>
  );
}
