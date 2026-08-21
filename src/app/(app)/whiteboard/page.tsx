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
import { Search, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BatchBar } from "@/components/data-table/batch-bar";
import { DataTable } from "@/components/data-table/data-table";
import { DetailPanel } from "@/components/detail-panel/detail-panel";
import { RelationshipEdge } from "@/components/edges/relationship-edge";
import { EntityNode } from "@/components/nodes/entity-node";
import { SettingsMenu } from "@/components/settings-menu";
import { OverlaySummary } from "@/components/temporal/overlay-summary";
import { TimelineMenu } from "@/components/temporal/timeline-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViewSwitch } from "@/components/view-switch";
import { useExpand } from "@/hooks/use-expand";
import { useOverlay } from "@/hooks/use-overlay";
import { RateLimitError } from "@/lib/api";
import { translateError, visibleErrorMessages } from "@/lib/errors";
import {
  type EntityNode as EntityNodeType,
  groupEdgesByPair,
  layoutGraph,
  projectGraph,
} from "@/lib/graph-adapter";
import { useAuthStore } from "@/store/auth";
import { useConflictFilterStore } from "@/store/conflict-filter";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";
import { useViewStore } from "@/store/view";

const NODE_TYPES: NodeTypes = { entity: EntityNode };
const EDGE_TYPES: EdgeTypes = { relationship: RelationshipEdge };

function Flow() {
  const overlay = useOverlay();
  const nodeOverrides = useGraphStore((s) => s.nodeOverrides);
  const conflictFilterActive = useConflictFilterStore((s) => s.active);
  const { fitView } = useReactFlow();

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
      void fitView({ duration: 300 });
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
  const role = useAuthStore((s) => s.role);
  const overlay = useOverlay();
  const [query, setQuery] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const { mutate, isPending, error, data } = useExpand();
  const searchPlaceholder = role === "VIEWER" ? "CNPJ" : "CPF ou CNPJ";

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [retryAfterSeconds]);

  const isBlocked = retryAfterSeconds > 0;
  const visibleErrors = data ? visibleErrorMessages(data.errors) : [];
  const statusMessage = isBlocked
    ? `Limite atingido. Tente novamente em ${String(retryAfterSeconds)}s.`
    : error
      ? translateError(error)
      : visibleErrors.length > 0
        ? visibleErrors.join(" ")
        : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border p-3 sm:gap-3">
        <span className="shrink-0 font-semibold text-sm">OSINT Studio</span>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="relative min-w-0">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
            />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !isPending &&
                  !isBlocked &&
                  query.trim() !== ""
                ) {
                  mutate(
                    { document: query.trim() },
                    {
                      onError: (mutationError) => {
                        if (mutationError instanceof RateLimitError) {
                          setRetryAfterSeconds(
                            Math.ceil(mutationError.retryAfterSeconds),
                          );
                        }
                      },
                    },
                  );
                }
              }}
              placeholder={searchPlaceholder}
              className="w-28 pl-8 sm:w-64"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || isBlocked || query.trim() === ""}
            onClick={() => {
              mutate(
                { document: query.trim() },
                {
                  onError: (mutationError) => {
                    if (mutationError instanceof RateLimitError) {
                      setRetryAfterSeconds(Math.ceil(mutationError.retryAfterSeconds));
                    }
                  },
                },
              );
            }}
            aria-label="Expandir"
            className="shrink-0 px-2 sm:px-3"
          >
            <Search size={14} className="sm:hidden" />
            <span className="hidden sm:inline">
              {isPending ? "Expandindo..." : "Expandir"}
            </span>
          </Button>
          {role === "ADMIN" ? (
            <Link
              href="/ingest"
              aria-label="Ingestão de texto"
              title="Ingestão de texto"
              className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-foreground hover:bg-white/10 sm:size-8"
            >
              <Upload size={16} />
            </Link>
          ) : null}
          <TimelineMenu />
          <ThemeToggle />
          <SettingsMenu />
        </div>
      </header>

      {statusMessage ? (
        <div
          className={`px-3 py-1.5 text-sm ${
            isBlocked || visibleErrors.length > 0 ? "text-amber-500" : "text-red-500"
          }`}
        >
          {statusMessage}
        </div>
      ) : null}

      <OverlaySummary />
      <BatchBar nodes={overlay.nodes} />

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          {view === "graph" ? (
            <ReactFlowProvider>
              <Flow />
            </ReactFlowProvider>
          ) : (
            <DataTable />
          )}
          <ViewSwitch />
        </div>
        <DetailPanel />
      </div>
    </div>
  );
}
