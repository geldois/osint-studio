"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { columns, toTableRow } from "@/components/data-table/columns";
import { relationshipsForNode } from "@/lib/relationships";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";

export function DataTable() {
  const rawNodes = useGraphStore((s) => s.rawNodes);
  const rawEdges = useGraphStore((s) => s.rawEdges);
  const roots = useGraphStore((s) => s.roots);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => {
    const nodeById = new Map(rawNodes.map((node) => [node.id, node] as const));
    return rawNodes.map((node) =>
      toTableRow(
        node,
        relationshipsForNode(node.id, rawEdges, nodeById).length,
        roots.has(node.id),
      ),
    );
  }, [rawNodes, rawEdges, roots]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const needle = filterValue.trim().toLowerCase();
      if (needle === "") {
        return true;
      }
      return `${row.original.label} ${row.original.summary}`.toLowerCase().includes(needle);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (rawNodes.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-muted text-sm">
        Nenhum dado ainda. Busque um CPF ou CNPJ para começar.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="border-border border-b p-3">
        <div className="relative w-72">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
          />
          <input
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
            }}
            placeholder="Filtrar por nome ou atributo..."
            className="w-full rounded border border-border bg-background py-1.5 pr-3 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-border border-b">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-3 py-2 text-left font-medium text-[11px] text-muted uppercase tracking-wide"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDirection === "asc" ? (
                            <ArrowUp size={11} />
                          ) : sortDirection === "desc" ? (
                            <ArrowDown size={11} />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => {
                  selectNode(row.original.node.id);
                }}
                className={`cursor-pointer border-border border-b transition-colors hover:bg-white/5 ${
                  selectedNodeId === row.original.node.id ? "bg-white/10" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 ? (
          <div className="p-6 text-center text-muted text-sm">
            Nenhum resultado para este filtro.
          </div>
        ) : null}
      </div>
    </div>
  );
}
