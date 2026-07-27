"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EntityNode } from "@/components/nodes/entity-node";
import { useExpand } from "@/hooks/use-expand";
import { RateLimitError } from "@/lib/api";
import { translateError } from "@/lib/errors";
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
  const nodesInitialized = useNodesInitialized();
  const needsLayoutRef = useRef(false);

  const edges = useMemo(() => rawEdges.map(apiEdgeToRfEdge), [rawEdges]);

  useEffect(() => {
    const { nodes: projected } = projectGraph(rawNodes, rawEdges, roots);
    needsLayoutRef.current = true;
    setNodes(projected);
  }, [rawNodes, rawEdges, roots, setNodes]);

  useEffect(() => {
    if (nodesInitialized && needsLayoutRef.current && nodes.length > 0) {
      needsLayoutRef.current = false;
      setNodes(layoutGraph(nodes, edges));
      void fitView({ duration: 300 });
    }
  }, [nodesInitialized, nodes, edges, setNodes, fitView]);

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
  const [cnpj, setCnpj] = useState("");
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

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border p-3">
        <input
          value={cnpj}
          onChange={(e) => {
            setCnpj(e.target.value);
          }}
          placeholder="CNPJ"
          className="rounded border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={isPending || isBlocked || cnpj.trim() === ""}
          onClick={() => {
            mutate(
              { cnpj: cnpj.trim() },
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
        ) : data && data.errors.length > 0 ? (
          <span className="text-amber-500 text-sm">
            {data.errors.map(translateError).join(" ")}
          </span>
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
