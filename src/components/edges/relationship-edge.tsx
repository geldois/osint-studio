"use client";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  EdgeLabelRenderer,
  getStraightPath,
} from "@xyflow/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EdgeRelationship, RelationshipEdgeData } from "@/lib/graph-adapter";
import { edgeTypeLabel } from "@/lib/relationships";
import { useSelectionStore } from "@/store/selection";

function byDirection(a: EdgeRelationship, b: EdgeRelationship): number {
  if (a.direction === b.direction) {
    return 0;
  }
  return a.direction === "backward" ? -1 : 1;
}

export function RelationshipEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<Edge<RelationshipEdgeData>>) {
  const selectedEdgeId = useSelectionStore((s) => s.selectedEdgeId);
  const selectEdge = useSelectionStore((s) => s.selectEdge);

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const relationships = [...(data?.relationships ?? [])].sort(byDirection);
  const isSelected = relationships.some((r) => r.edgeId === selectedEdgeId);
  const isPossiblyMatch = relationships.every((r) => r.edgeType === "possibly_matches");

  const diamondClassName = `block h-3 w-3 shrink-0 rotate-45 rounded-[3px] border bg-surface transition-colors ${
    isSelected ? "border-white bg-white" : "border-border"
  }`;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        interactionWidth={0}
        className={isPossiblyMatch ? "stroke-amber-500!" : "stroke-border!"}
        style={isPossiblyMatch ? { strokeDasharray: "4 4" } : undefined}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${String(labelX)}px, ${String(labelY)}px)`,
          }}
        >
          {relationships.length > 0 ? (
            <Popover>
              <PopoverTrigger
                aria-label="Ver relações desta aresta"
                render={
                  <button
                    type="button"
                    className={`p-0 pointer-events-auto cursor-pointer ${diamondClassName}`}
                  />
                }
              />
              <PopoverContent className="nodrag nopan w-auto min-w-0 gap-0.5 p-1.5">
                {relationships.map((relationship) => (
                  <button
                    key={relationship.edgeId}
                    type="button"
                    onClick={() => {
                      selectEdge(relationship.edgeId);
                    }}
                    aria-label="Ver atributos da relação"
                    className={`whitespace-nowrap text-left text-[9px] transition-colors hover:text-foreground ${
                      selectedEdgeId === relationship.edgeId
                        ? "font-medium text-foreground"
                        : "text-muted"
                    }`}
                  >
                    {relationship.direction === "backward" ? "← " : "→ "}
                    {edgeTypeLabel(relationship.edgeType)}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          ) : (
            <span className={diamondClassName} />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
