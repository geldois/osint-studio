import type { ColumnDef, Table } from "@tanstack/react-table";
import { History } from "lucide-react";
import { EntityIcon } from "@/components/nodes/entity-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { extractLabel, nodeToRows } from "@/lib/graph-adapter";
import { nodeTypeLabel } from "@/lib/relationships";
import { useTableSelectionStore } from "@/store/table-selection";
import type { ApiNode, NodeType } from "@/types/api";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    hiddenBelowMd?: boolean;
  }
}

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

function SelectRowCheckbox({ id }: { id: string }) {
  const selected = useTableSelectionStore((s) => s.selectedIds.has(id));
  const toggle = useTableSelectionStore((s) => s.toggle);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => {
          toggle(id);
        }}
      />
    </span>
  );
}

function SelectAllCheckbox({ table }: { table: Table<TableRow> }) {
  const selectedIds = useTableSelectionStore((s) => s.selectedIds);
  const setMany = useTableSelectionStore((s) => s.setMany);

  const visibleIds = table.getRowModel().rows.map((row) => row.original.node.id);
  const selectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected}
        onCheckedChange={(checked) => {
          setMany(visibleIds, checked);
        }}
      />
    </span>
  );
}

export const columns: ColumnDef<TableRow>[] = [
  {
    id: "select",
    size: 40,
    enableSorting: false,
    header: ({ table }) => <SelectAllCheckbox table={table} />,
    cell: ({ row }) => <SelectRowCheckbox id={row.original.node.id} />,
  },
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
    meta: { hiddenBelowMd: true },
    cell: ({ row }) => (
      <span className="text-muted">{row.original.summary || "—"}</span>
    ),
  },
  {
    accessorKey: "relationshipCount",
    header: "Relações",
    size: 80,
    meta: { hiddenBelowMd: true },
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
