"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  type EdgeTypes,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useRef } from "react";
import { RelationshipEdge } from "@/components/edges/relationship-edge";
import { EntityNode } from "@/components/nodes/entity-node";
import { useOverlay } from "@/hooks/use-overlay";
import {
  type EntityNode as EntityNodeType,
  groupEdgesByPair,
  layoutGraph,
  projectGraph,
} from "@/lib/graph-adapter";
import { useConflictFilterStore } from "@/store/conflict-filter";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";

const NODE_TYPES: NodeTypes = { entity: EntityNode };
const EDGE_TYPES: EdgeTypes = { relationship: RelationshipEdge };

function Flow() {
  const overlay = useOverlay();
  const nodeOverrides = useGraphStore((s) => s.nodeOverrides);
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const conflictFilterActive = useConflictFilterStore((s) => s.active);
  const { fitView, setCenter, getZoom } = useReactFlow();

  const overriddenNodeIds = useMemo(
    () => new Set(Object.keys(nodeOverrides)),
    [nodeOverrides],
  );

  const rawNodes = useMemo(() => {
    if (!conflictFilterActive) {
      return overlay.nodes;
    }
    const conflictingIds = new Set(Object.keys(overlay.conflicts.nodes));
    return overlay.nodes.filter((node) => conflictingIds.has(node.id));
  }, [overlay, conflictFilterActive]);
  const rawEdges = useMemo(() => {
    if (!conflictFilterActive) {
      return overlay.edges;
    }
    const nodeIds = new Set(rawNodes.map((node) => node.id));
    return overlay.edges.filter(
      (edge) => nodeIds.has(edge.source_id) && nodeIds.has(edge.target_id),
    );
  }, [overlay, conflictFilterActive, rawNodes]);
  const roots = overlay.roots;

  const [nodes, setNodes, onNodesChange] = useNodesState<EntityNodeType>([]);

  const edges = useMemo(() => groupEdgesByPair(rawEdges), [rawEdges]);

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const { nodes: projected } = projectGraph(
      rawNodes,
      rawEdges,
      roots,
      overlay.conflicts.nodes,
      overriddenNodeIds,
    );
    const projectedIds = new Set(projected.map((node) => node.id));
    setNodes(projected);

    const cancellation = { requested: false };

    async function runLayout(): Promise<void> {
      if (projected.length === 0) {
        return;
      }
      while (
        !cancellation.requested &&
        !(
          nodesRef.current.length === projected.length &&
          nodesRef.current.every(
            (node) =>
              projectedIds.has(node.id) &&
              node.measured?.width !== undefined &&
              node.measured.height !== undefined,
          )
        )
      ) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }
      if (cancellation.requested) {
        return;
      }
      const laidOut = layoutGraph(nodesRef.current, edges);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (cancellation.requested) {
        return;
      }
      setNodes(laidOut);

      const focusNode =
        laidOut.find((node) => node.id === focusNodeId) ??
        laidOut.find((node) => roots.has(node.id));
      if (
        focusNode?.measured?.width !== undefined &&
        focusNode.measured.height !== undefined
      ) {
        void setCenter(
          focusNode.position.x + focusNode.measured.width / 2,
          focusNode.position.y + focusNode.measured.height / 2,
          { zoom: getZoom(), duration: 300 },
        );
      } else {
        void fitView({ duration: 300 });
      }
    }

    void runLayout();
    return () => {
      cancellation.requested = true;
    };
  }, [
    rawNodes,
    rawEdges,
    roots,
    overlay.conflicts.nodes,
    overriddenNodeIds,
    edges,
    setNodes,
    fitView,
    setCenter,
    getZoom,
    focusNodeId,
  ]);

  const clearSelection = useSelectionStore((s) => s.clearSelection);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodesChange={onNodesChange}
      onPaneClick={clearSelection}
      fitView
      minZoom={0.02}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
    </ReactFlow>
  );
}

export function GraphView() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
