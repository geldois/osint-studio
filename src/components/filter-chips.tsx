"use client";

import { Filter, type LucideIcon, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Flyout } from "@/components/flyout";

export interface FilterChipsOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterChipsProps {
  options: FilterChipsOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  icon?: LucideIcon;
}

export function FilterChips({
  options,
  selected,
  onChange,
  label = "Filtros",
  icon: Icon = Filter,
}: FilterChipsProps) {
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
        title={label}
        align="start"
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            className="relative size-8 shrink-0 rounded-md bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary aria-expanded:bg-primary/25 aria-expanded:text-primary"
          >
            <Icon size={14} />
            {selected.length > 0 ? (
              <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {selected.length}
              </span>
            ) : null}
          </Button>
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
                {option.count !== undefined ? (
                  <span className="text-[11px] text-muted">{option.count}</span>
                ) : null}
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
