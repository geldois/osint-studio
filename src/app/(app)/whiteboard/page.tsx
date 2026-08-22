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
import { BatchBar } from "@/components/data-table/batch-bar";
import { DataTable } from "@/components/data-table/data-table";
import { DetailPanel } from "@/components/detail-panel/detail-panel";
import { RelationshipEdge } from "@/components/edges/relationship-edge";
import { GraphInfoButton } from "@/components/graph-info-button";
import { EntityNode } from "@/components/nodes/entity-node";
import { SettingsMenu } from "@/components/settings-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewSwitch } from "@/components/view-switch";
import { WhiteboardSearchBar } from "@/components/whiteboard-search-bar";
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
import { useViewStore } from "@/store/view";

const NODE_TYPES: NodeTypes = { entity: EntityNode };
const EDGE_TYPES: EdgeTypes = { relationship: RelationshipEdge };

function Flow() {
  const overlay = useOverlay();
  const nodeOverrides = useGraphStore((s) => s.nodeOverrides);
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const conflictFilterActive = useConflictFilterStore((s) => s.active);
  const { fitView, setCenter, getZoom, getNodesBounds } = useReactFlow();

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

  // Kept in sync via effect (not during render) and read from inside the
  // async layout poll below. React Flow fires internal dimension-change
  // events while nodes settle after a reset, updating `nodes` several times
  // in quick succession — depending on `nodes` directly in the layout effect
  // would tear down and cancel the in-flight layout on every one of those
  // churns, so re-expanding an already-rendered graph could cancel its own
  // layout before it finished and leave every card stacked at (0, 0).
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
      const laidOut = await layoutGraph(nodesRef.current, edges);
      // eslint's static analysis can't see that the effect cleanup (a separate
      // closure) can flip `cancellation.requested` during this await — it's a
      // real, reachable branch.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (cancellation.requested) {
        return;
      }
      setNodes(laidOut);

      const focusNode =
        laidOut.find((node) => node.id === focusNodeId) ??
        laidOut.find((node) => roots.has(node.id));
      if (focusNode !== undefined) {
        const bounds = getNodesBounds([focusNode]);
        void setCenter(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, {
          zoom: getZoom(),
          duration: 300,
        });
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
    getNodesBounds,
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
      proOptions={{ hideAttribution: true }}
    >
      <Background />
    </ReactFlow>
  );
}

export default function WhiteboardPage() {
  const view = useViewStore((s) => s.view);
  const overlay = useOverlay();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-surface p-2">
        <div className="flex shrink-0 items-center gap-2">
          <GraphInfoButton />
          <ViewSwitch />
        </div>
        <div className="flex flex-1 justify-center">
          <WhiteboardSearchBar />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <SettingsMenu />
        </div>
      </header>

      <BatchBar nodes={overlay.nodes} />

      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          {view === "graph" ? (
            <ReactFlowProvider>
              <Flow />
            </ReactFlowProvider>
          ) : (
            <DataTable />
          )}
        </div>
        <DetailPanel />
      </div>
    </div>
  );
}
