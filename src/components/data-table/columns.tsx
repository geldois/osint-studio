import type { ColumnDef } from "@tanstack/react-table";
import { History } from "lucide-react";
import { EntityIcon } from "@/components/nodes/entity-icon";
import { extractLabel, nodeToRows } from "@/lib/graph-adapter";
import { nodeTypeLabel } from "@/lib/relationships";
import type { ApiNode, NodeType } from "@/types/api";

export interface TableRow {
  node: ApiNode;
  label: string;
  nodeType: NodeType;
  summary: string;
  relationshipCount: number;
  isRoot: boolean;
}

function nodeSummary(node: ApiNode): string {
  const rows = nodeToRows(node);
  // The label itself is always the first row for most node types (cnpj,
  // cpf, cep...) — skip it here since it's already its own column.
  return rows
    .slice(1, 3)
    .map((row) => row.value)
    .filter((value) => value !== "" && value !== "—")
    .join(" · ");
}

export function toTableRow(
  node: ApiNode,
  relationshipCount: number,
  isRoot: boolean,
): TableRow {
  return {
    node,
    label: extractLabel(node),
    nodeType: node.type,
    summary: nodeSummary(node),
    relationshipCount,
    isRoot,
  };
}

export const columns: ColumnDef<TableRow>[] = [
  {
    accessorKey: "nodeType",
    header: "Tipo",
    size: 110,
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <EntityIcon nodeType={row.original.nodeType} size={13} />
        <span>{nodeTypeLabel(row.original.nodeType)}</span>
      </span>
    ),
  },
  {
    accessorKey: "label",
    header: "Nome",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.label}
        {row.original.isRoot ? (
          <span className="ml-1.5 text-[9px] text-muted">● raiz</span>
        ) : null}
      </span>
    ),
  },
  {
    accessorKey: "summary",
    header: "Resumo",
    cell: ({ row }) => (
      <span className="text-muted">{row.original.summary || "—"}</span>
    ),
  },
  {
    accessorKey: "relationshipCount",
    header: "Relações",
    size: 80,
    cell: ({ row }) => row.original.relationshipCount,
  },
  {
    id: "history",
    header: () => (
      <span className="flex items-center gap-1" title="Histórico de revisão — em breve">
        <History size={12} />
        Histórico
      </span>
    ),
    size: 90,
    enableSorting: false,
    cell: () => <span className="text-muted/50">em breve</span>,
  },
];
