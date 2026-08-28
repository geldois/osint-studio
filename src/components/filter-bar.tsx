"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

export interface FilterBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  leftSlot?: ReactNode;
}

export function FilterBar({ value, onChange, placeholder, leftSlot }: FilterBarProps) {
  return (
    <div className="flex w-full items-center gap-1 rounded-md border border-border bg-surface-2 p-1">
      {leftSlot}
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent pl-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      {value === "" ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted">
          <Search size={13} className="pointer-events-none" />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            onChange("");
          }}
          aria-label="Limpar"
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-foreground/5"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
