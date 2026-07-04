"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { EntityNode } from "@/components/nodes/entity-node";
import { useExpand } from "@/hooks/use-expand";
import {
  apiEdgeToRfEdge,
  type EntityNode as EntityNodeType,
  projectGraph,
} from "@/lib/graph-adapter";
import { useGraphStore } from "@/store/graph";

const NODE_TYPES: NodeTypes = { entity: EntityNode };

function Flow() {
  const rawNodes = useGraphStore((s) => s.rawNodes);
  const rawEdges = useGraphStore((s) => s.rawEdges);
  const roots = useGraphStore((s) => s.roots);
  const layout = useGraphStore((s) => s.layout);
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<EntityNodeType>([]);
  const nodesInitialized = useNodesInitialized();

  const edges = useMemo(() => rawEdges.map(apiEdgeToRfEdge), [rawEdges]);

  useEffect(() => {
    const { nodes: projected } = projectGraph(rawNodes, rawEdges, roots, layout);
    setNodes((previous) => {
      const byId = new Map(previous.map((node) => [node.id, node]));
      return projected.map((node) => {
        const existing = byId.get(node.id);
        return existing ? { ...existing, data: node.data } : node;
      });
    });
  }, [rawNodes, rawEdges, roots, layout, setNodes]);

  useEffect(() => {
    if (nodesInitialized && nodes.length > 0) {
      void fitView({ duration: 300 });
    }
  }, [nodesInitialized, nodes.length, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export default function WhiteboardPage() {
  const [cnpj, setCnpj] = useState("");
  const { mutate, isPending, error } = useExpand();

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
          disabled={isPending || cnpj.trim() === ""}
          onClick={() => {
            mutate({ cnpj: cnpj.trim(), anchorId: null });
          }}
          className="rounded bg-white px-3 py-1.5 font-medium text-black text-sm disabled:opacity-50"
        >
          {isPending ? "Expandindo..." : "Expandir"}
        </button>
        {error ? <span className="text-red-500 text-sm">{error.message}</span> : null}
      </header>

      <div className="flex-1">
        <ReactFlowProvider>
          <Flow />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
