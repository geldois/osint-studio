"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { columnsFor, toTableRow } from "@/components/data-table/columns";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOverlay } from "@/hooks/use-overlay";
import { relationshipsForNode } from "@/lib/relationships";
import { useSelectionStore } from "@/store/selection";

const COLLECTION_PAGE_SIZE = 50;

export function CollectionPanel({
  title,
  nodeIds,
}: {
  title: string;
  nodeIds: string[];
}) {
  const overlay = useOverlay();
  const selectNode = useSelectionStore((s) => s.selectNode);
  const clearCollection = useSelectionStore((s) => s.clearCollection);

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: COLLECTION_PAGE_SIZE,
  });

  const idSet = useMemo(() => new Set(nodeIds), [nodeIds]);
  const filteredNodes = useMemo(
    () => overlay.nodes.filter((node) => idSet.has(node.id)),
    [overlay.nodes, idSet],
  );

  const data = useMemo(() => {
    const nodeById = new Map(overlay.nodes.map((node) => [node.id, node] as const));
    return filteredNodes.map((node) =>
      toTableRow(
        node,
        relationshipsForNode(node.id, overlay.edges, nodeById).length,
        overlay.roots.has(node.id),
      ),
    );
  }, [overlay, filteredNodes]);

  const distinctTypes = new Set(filteredNodes.map((node) => node.type));
  const sampleNode = distinctTypes.size === 1 ? (filteredNodes[0] ?? null) : null;
  const columns = useMemo(() => columnsFor(sampleNode), [sampleNode]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: (value: string) => {
      setGlobalFilter(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const needle = filterValue.trim().toLowerCase();
      if (needle === "") {
        return true;
      }
      const haystack = [
        row.original.label,
        row.original.summary,
        ...row.original.attributes.map((attribute) => attribute.value),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-border border-b bg-surface-2 p-2">
        <span className="min-w-0 truncate text-[12px] font-medium">
          {title} <span className="text-muted">({nodeIds.length})</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={clearCollection}
          aria-label="Fechar coleção"
        >
          <X size={14} />
        </Button>
      </div>
      <div className="shrink-0 border-border border-b bg-surface p-2">
        <FilterBar
          value={globalFilter}
          onChange={(value) => {
            table.setGlobalFilter(value);
          }}
          placeholder="Filtrar..."
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" orientation="both">
          <Table className="text-sm">
            <TableHeader className="sticky top-0 z-10 bg-surface">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className={`whitespace-nowrap px-3 py-2 text-[11px] text-muted uppercase tracking-wide ${
                          header.column.columnDef.meta?.hiddenBelowMd
                            ? "hidden md:table-cell"
                            : ""
                        }`}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sortDirection === "asc" ? (
                              <ArrowUp size={11} />
                            ) : sortDirection === "desc" ? (
                              <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => {
                    selectNode(row.original.node.id);
                  }}
                  className="cursor-pointer border-border transition-colors hover:bg-foreground/5"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-3 py-2 ${
                        cell.column.columnDef.meta?.hiddenBelowMd
                          ? "hidden md:table-cell"
                          : ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {filteredRowCount === 0 ? (
          <div className="p-6 text-center text-muted text-sm">
            Nenhum resultado para este filtro.
          </div>
        ) : null}
      </div>

      {filteredRowCount > 0 ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-border border-t bg-surface p-2">
          <span className="text-[11px] text-muted">
            {filteredRowCount} registro{filteredRowCount === 1 ? "" : "s"}
          </span>
          <Pagination
            page={pagination.pageIndex + 1}
            pageCount={table.getPageCount()}
            onPageChange={(page) => {
              table.setPageIndex(page - 1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
