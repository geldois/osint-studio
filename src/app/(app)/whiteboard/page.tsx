"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EntityNode } from "@/components/nodes/entity-node";
import { useExpand } from "@/hooks/use-expand";
import { RateLimitError } from "@/lib/api";
import { isCredentialError, translateError } from "@/lib/errors";
import {
  apiEdgeToRfEdge,
  type EntityNode as EntityNodeType,
  layoutGraph,
  projectGraph,
} from "@/lib/graph-adapter";
import { useGraphStore } from "@/store/graph";

const NODE_TYPES: NodeTypes = { entity: EntityNode };

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

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background />
    </ReactFlow>
  );
}

export default function WhiteboardPage() {
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
  // Credential errors surface via the settings button's warning icon instead
  // (hover tooltip), so they're excluded here — and deduped, since a single
  // missing credential fails both the CNEP and CEIS fetches identically.
  const visibleErrors = data
    ? [...new Set(data.errors.filter((e) => !isCredentialError(e)).map(translateError))]
    : [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border p-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="CPF ou CNPJ"
          className="rounded border border-border bg-background px-3 py-1.5 text-sm"
        />
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
          className="rounded bg-white px-3 py-1.5 font-medium text-black text-sm disabled:opacity-50"
        >
          {isPending ? "Expandindo..." : "Expandir"}
        </button>
        {isBlocked ? (
          <span className="text-amber-500 text-sm">
            Limite atingido. Tente novamente em {retryAfterSeconds}s.
          </span>
        ) : error ? (
          <span className="text-red-500 text-sm">{translateError(error)}</span>
        ) : visibleErrors.length > 0 ? (
          <span className="text-amber-500 text-sm">{visibleErrors.join(" ")}</span>
        ) : null}
      </header>

      <div className="flex-1">
        <ReactFlowProvider>
          <Flow />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
