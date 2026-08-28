"use client";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  EdgeLabelRenderer,
  getStraightPath,
} from "@xyflow/react";
import {
  isEdgeHighlighted,
  type EdgeRelationship,
  type RelationshipEdgeData,
} from "@/lib/graph-adapter";
import { edgeTypeLabel } from "@/lib/relationships";
import { useHoverStore } from "@/store/hover";
import { useSelectionStore } from "@/store/selection";

function byDirection(a: EdgeRelationship, b: EdgeRelationship): number {
  if (a.direction === b.direction) {
    return 0;
  }
  return a.direction === "backward" ? -1 : 1;
}

export function RelationshipEdge({
  id,
  source,
  target,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<Edge<RelationshipEdgeData>>) {
  const selectedEdgeId = useSelectionStore((s) => s.selectedEdgeId);
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const selectEdge = useSelectionStore((s) => s.selectEdge);
  const hoveredNodeId = useHoverStore((s) => s.hoveredNodeId);
  const hoveredEdgeGroupId = useHoverStore((s) => s.hoveredEdgeGroupId);
  const setHoveredEdgeGroup = useHoverStore((s) => s.setHoveredEdgeGroup);

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const relationships = [...(data?.relationships ?? [])].sort(byDirection);
  const isSelected = relationships.some((r) => r.edgeId === selectedEdgeId);
  const isPossiblyMatch = relationships.every((r) => r.edgeType === "possibly_matches");
  const isHighlighted = isEdgeHighlighted({
    edgeGroupId: id,
    hoveredEdgeGroupId,
    hoveredNodeId,
    selectedNodeId,
    source,
    target,
  });

  const diamondClassName = `block h-3 w-3 shrink-0 rotate-45 rounded-[3px] border bg-surface transition-colors ${
    isSelected
      ? "border-white bg-white"
      : isHighlighted
        ? "border-white"
        : "border-border"
  }`;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        interactionWidth={0}
        className={
          isPossiblyMatch
            ? "stroke-amber-500!"
            : isSelected || isHighlighted
              ? "stroke-white!"
              : "stroke-border!"
        }
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
            <button
              type="button"
              onClick={() => {
                const first = relationships[0];
                if (first !== undefined) {
                  selectEdge(first.edgeId);
                }
              }}
              onMouseEnter={() => {
                setHoveredEdgeGroup(id);
              }}
              onMouseLeave={() => {
                setHoveredEdgeGroup(null);
              }}
              aria-label="Ver relação nesta aresta"
              title={relationships
                .map(
                  (relationship) =>
                    `${relationship.direction === "backward" ? "← " : "→ "}${edgeTypeLabel(relationship.edgeType)}`,
                )
                .join("\n")}
              className={`p-0 pointer-events-auto cursor-pointer ${diamondClassName}`}
            />
          ) : (
            <span className={diamondClassName} />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
