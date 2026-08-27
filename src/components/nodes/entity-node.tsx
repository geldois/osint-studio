"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { cva } from "class-variance-authority";
import { EntityIcon } from "@/components/nodes/entity-icon";
import type { EntityNode as EntityNodeType } from "@/lib/graph-adapter";
import { nodeTypeLabel } from "@/lib/relationships";
import { useSelectionStore } from "@/store/selection";

const nodeVariants = cva(
  "flex w-[208px] items-start gap-2 overflow-hidden rounded-md border-2 bg-surface px-2.5 py-2 text-foreground text-[12px] shadow-lg transition-colors",
  {
    variants: {
      nodeType: {
        address: "border-amber-500",
        cnae: "border-sky-400",
        company: "border-emerald-500",
        email: "border-violet-500",
        person: "border-blue-500",
        phone: "border-orange-500",
        sanction: "border-red-500",
        text_source: "border-slate-400",
      },
      isSelected: {
        true: "ring-2 ring-white",
        false: "",
      },
    },
  },
);

export function EntityNode({ id, data }: NodeProps<EntityNodeType>) {
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const isSelected = selectedNodeId === id;
  const { isOverridden, conflictCount } = data;

  return (
    <button
      type="button"
      onClick={() => {
        selectNode(id);
      }}
      className={nodeVariants({ nodeType: data.nodeType, isSelected })}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0!"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      />
      <span className="mt-0.5 shrink-0 opacity-70">
        <EntityIcon nodeType={data.nodeType} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="line-clamp-2 font-medium leading-snug">{data.label}</span>
        <span className="text-[9px] text-muted uppercase tracking-wide">
          {nodeTypeLabel(data.nodeType)}
        </span>
      </span>
      <span className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
        {data.isRoot ? <span className="mt-0.5 text-[9px] opacity-50">●</span> : null}
        {isOverridden ? (
          <span
            title="Versão fixada manualmente"
            className="rounded-sm bg-amber-500/20 px-1 text-[8px] text-amber-500 uppercase"
          >
            fixado
          </span>
        ) : conflictCount > 1 ? (
          <span
            title={`${String(conflictCount)} versões desta entidade na sobreposição`}
            className="rounded-full bg-white/15 px-1 text-[8px] tabular-nums"
          >
            {conflictCount}
          </span>
        ) : null}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0!"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      />
    </button>
  );
}
