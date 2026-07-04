"use client";

import { Handle, type NodeProps, NodeResizer, Position } from "@xyflow/react";
import { cva } from "class-variance-authority";
import { useExpand } from "@/hooks/use-expand";
import type { EntityNode as EntityNodeType } from "@/lib/graph-adapter";

const nodeVariants = cva(
  "flex w-full flex-col overflow-hidden rounded-md border-2 bg-surface text-foreground text-xs shadow",
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
      },
      isRoot: {
        true: "ring-2 ring-white",
        false: "",
      },
    },
  },
);

export function EntityNode({ id, data, selected }: NodeProps<EntityNodeType>) {
  const { mutate, isPending } = useExpand();
  const cnpj = data.nodeType === "company" ? data.cnpj : null;

  return (
    <div className={nodeVariants({ nodeType: data.nodeType, isRoot: data.isRoot })}>
      <NodeResizer minWidth={200} minHeight={100} isVisible={selected} />
      <Handle type="target" position={Position.Top} />
      <div className="flex items-baseline justify-between gap-2 border-border border-b px-3 py-1.5">
        <span className="truncate font-medium">{data.label}</span>
        <span className="shrink-0 uppercase opacity-50">{data.nodeType}</span>
      </div>
      <div className="px-3 py-2">
        <table className="w-full border-collapse">
          <tbody>
            {data.rows.map((row) => (
              <tr key={`${row.key}-${row.value}`} className="align-top">
                <td className="whitespace-nowrap pr-3 opacity-50">{row.key}</td>
                <td className="break-all">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cnpj !== null ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            mutate({ cnpj, anchorId: id });
          }}
          className="border-border border-t bg-white/10 px-2 py-1 text-[10px] disabled:opacity-50"
        >
          {isPending ? "Expandindo..." : "Expandir"}
        </button>
      ) : null}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
