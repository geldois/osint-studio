"use client";

import { ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function paginationWindow(
  page: number,
  pageCount: number,
  windowSize = 5,
): number[] {
  if (pageCount <= windowSize) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = paginationWindow(page, pageCount);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Paginação">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={page === 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
        aria-label="Página anterior"
      >
        <ChevronLeft size={14} />
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          type="button"
          variant={p === page ? "default" : "outline"}
          size="icon-sm"
          onClick={() => {
            onPageChange(p);
          }}
          aria-label={`Página ${String(p)}`}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={page === pageCount}
        onClick={() => {
          onPageChange(page + 1);
        }}
        aria-label="Próxima página"
      >
        <ChevronRight size={14} />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={page === pageCount}
        onClick={() => {
          onPageChange(pageCount);
        }}
        aria-label="Última página"
        title="Última página"
      >
        <ChevronsRight size={14} />
      </Button>
    </nav>
  );
}
