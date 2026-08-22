import type { ColumnDef, Table } from "@tanstack/react-table";
import { EntityIcon } from "@/components/nodes/entity-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { extractLabel, nodeToRows, type CardRow } from "@/lib/graph-adapter";
import { formatFetchedAt } from "@/lib/overlay";
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
  attributes: CardRow[];
  fetchedAt: string;
  provider: string;
  relationshipCount: number;
  isRoot: boolean;
}

function nodeSummary(attributes: CardRow[]): string {
  return attributes
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
  const attributes = nodeToRows(node);
  return {
    node,
    label: extractLabel(node),
    nodeType: node.type,
    summary: nodeSummary(attributes),
    attributes,
    fetchedAt: node.revision.fetched_at,
    provider: node.revision.provider,
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

const selectColumn: ColumnDef<TableRow> = {
  id: "select",
  size: 40,
  enableSorting: false,
  header: ({ table }) => <SelectAllCheckbox table={table} />,
  cell: ({ row }) => <SelectRowCheckbox id={row.original.node.id} />,
};

const typeColumn: ColumnDef<TableRow> = {
  accessorKey: "nodeType",
  header: "Tipo",
  cell: ({ row }) => (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <EntityIcon nodeType={row.original.nodeType} size={13} />
      <span>{nodeTypeLabel(row.original.nodeType)}</span>
    </span>
  ),
};

const labelColumn: ColumnDef<TableRow> = {
  accessorKey: "label",
  header: "Nome",
  cell: ({ row }) => (
    <span className="whitespace-nowrap font-medium">
      {row.original.label}
      {row.original.isRoot ? (
        <span className="ml-1.5 text-[9px] text-muted">● raiz</span>
      ) : null}
    </span>
  ),
};

const originColumn: ColumnDef<TableRow> = {
  id: "origin",
  header: "Origem",
  meta: { hiddenBelowMd: true },
  cell: ({ row }) => (
    <span className="whitespace-nowrap text-muted">
      {formatFetchedAt(row.original.fetchedAt)} · {row.original.provider}
    </span>
  ),
};

const relationshipCountColumn: ColumnDef<TableRow> = {
  accessorKey: "relationshipCount",
  header: "Relações",
  size: 80,
  meta: { hiddenBelowMd: true },
  cell: ({ row }) => row.original.relationshipCount,
};

const summaryColumn: ColumnDef<TableRow> = {
  accessorKey: "summary",
  header: "Resumo",
  meta: { hiddenBelowMd: true },
  cell: ({ row }) => <span className="text-muted">{row.original.summary || "—"}</span>,
};

function summaryColumns(): ColumnDef<TableRow>[] {
  return [
    selectColumn,
    typeColumn,
    labelColumn,
    summaryColumn,
    originColumn,
    relationshipCountColumn,
  ];
}

function richColumnsFor(sampleAttributes: CardRow[]): ColumnDef<TableRow>[] {
  const attributeColumns: ColumnDef<TableRow>[] = sampleAttributes.map((sample) => ({
    id: `attr:${sample.key}`,
    header: sample.key,
    meta: { hiddenBelowMd: true },
    cell: ({ row }) => {
      const value = row.original.attributes.find(
        (attribute) => attribute.key === sample.key,
      )?.value;
      return <span className="whitespace-nowrap">{value ?? "—"}</span>;
    },
  }));
  return [
    selectColumn,
    typeColumn,
    labelColumn,
    ...attributeColumns,
    originColumn,
    relationshipCountColumn,
  ];
}

export function columnsFor(sampleNode: ApiNode | null): ColumnDef<TableRow>[] {
  if (sampleNode === null) {
    return summaryColumns();
  }
  return richColumnsFor(nodeToRows(sampleNode));
}
