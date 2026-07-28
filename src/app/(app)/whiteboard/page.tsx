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
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DetailPanel } from "@/components/detail-panel/detail-panel";
import { RelationshipEdge } from "@/components/edges/relationship-edge";
import { EntityNode } from "@/components/nodes/entity-node";
import { SettingsMenu } from "@/components/settings-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewSwitch } from "@/components/view-switch";
import { useExpand } from "@/hooks/use-expand";
import { RateLimitError } from "@/lib/api";
import { translateError, visibleErrorMessages } from "@/lib/errors";
import {
  apiEdgeToRfEdge,
  type EntityNode as EntityNodeType,
  layoutGraph,
  projectGraph,
} from "@/lib/graph-adapter";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";
import { useViewStore } from "@/store/view";

const NODE_TYPES: NodeTypes = { entity: EntityNode };
const EDGE_TYPES: EdgeTypes = { relationship: RelationshipEdge };

function Flow() {
  const rawNodes = useGraphStore((s) => s.rawNodes);
  const rawEdges = useGraphStore((s) => s.rawEdges);
  const roots = useGraphStore((s) => s.roots);
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<EntityNodeType>([]);

  const edges = useMemo(() => rawEdges.map(apiEdgeToRfEdge), [rawEdges]);

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
    const { nodes: projected } = projectGraph(rawNodes, rawEdges, roots);
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
  }, [rawNodes, rawEdges, roots, edges, setNodes, fitView]);

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
  const [query, setQuery] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const { mutate, isPending, error, data } = useExpand();

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
      <header className="flex items-center justify-between gap-3 border-b border-border p-3">
        <span className="font-semibold text-sm">OSINT Studio</span>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isPending && !isBlocked && query.trim() !== "") {
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
                }
              }}
              placeholder="CPF ou CNPJ"
              className="w-64 rounded border border-border bg-background py-1.5 pr-3 pl-8 text-sm"
            />
          </div>
          <button
            type="button"
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
            className="shrink-0 rounded border border-border bg-surface px-3 py-1.5 font-medium text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {isPending ? "Expandindo..." : "Expandir"}
          </button>
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
