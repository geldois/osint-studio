"use client";

import { Filter, X } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Flyout } from "@/components/flyout";

export interface FilterChipsOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterChipsProps {
  options: FilterChipsOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FilterChips({ options, selected, onChange }: FilterChipsProps) {
  const [open, setOpen] = useState(false);
  const labelByValue = new Map(
    options.map((option) => [option.value, option.label] as const),
  );

  function toggle(value: string, checked: boolean): void {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  }

  function remove(value: string): void {
    onChange(selected.filter((v) => v !== value));
  }

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Flyout
        open={open}
        onOpenChange={setOpen}
        title="Filtros"
        align="start"
        trigger={
          <button
            type="button"
            aria-label="Filtros"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs font-bold hover:bg-muted/20"
          >
            <Filter size={13} />
            Filtros
          </button>
        }
      >
        <ul className="max-h-72 space-y-1 overflow-auto p-1.5">
          {options.map((option) => (
            <li key={option.value}>
              <label className="flex items-center gap-2 rounded-md p-1.5 text-[12px] hover:bg-surface-2">
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) => {
                    toggle(option.value, checked);
                  }}
                />
                <span className="flex-1">{option.label}</span>
                <span className="text-[11px] text-muted">{option.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </Flyout>

      {selected.map((value) => (
        <span
          key={value}
          className="flex items-center gap-1 rounded-md border border-primary/40 bg-accent py-0.5 pr-2 pl-1 text-accent-foreground text-xs"
        >
          <button
            type="button"
            onClick={() => {
              remove(value);
            }}
            aria-label={`Remover filtro ${labelByValue.get(value) ?? value}`}
            className="flex items-center justify-center rounded-sm p-0.5 hover:bg-destructive/15 hover:text-destructive"
          >
            <X size={11} />
          </button>
          {labelByValue.get(value) ?? value}
        </span>
      ))}
    </div>
  );
}
