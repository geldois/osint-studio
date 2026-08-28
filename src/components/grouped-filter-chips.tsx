"use client";

import { Filter, X } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Flyout } from "@/components/flyout";

export interface FilterGroup<T extends string> {
  title: string;
  options: { value: T; label: string; count: number }[];
  selected: T[];
  onChange: (next: T[]) => void;
}

export function GroupedFilterChips({ groups }: { groups: FilterGroup<string>[] }) {
  const [open, setOpen] = useState(false);
  const totalSelected = groups.reduce((sum, group) => sum + group.selected.length, 0);
  const visibleGroups = groups.filter((group) => group.options.length > 0);

  if (visibleGroups.length === 0) {
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
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs font-bold hover:bg-foreground/5"
          >
            <Filter size={13} />
            Filtros
            {totalSelected > 0 ? (
              <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {totalSelected}
              </span>
            ) : null}
          </button>
        }
      >
        <div className="max-h-72 overflow-auto p-1.5">
          {visibleGroups.map((group) => (
            <div key={group.title} className="mb-2 last:mb-0">
              <p className="px-1.5 py-1 font-bold text-[10px] text-muted uppercase tracking-wide">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.options.map((option) => (
                  <li key={option.value}>
                    <label className="flex items-center gap-2 rounded-md p-1.5 text-[12px] hover:bg-surface-2">
                      <Checkbox
                        checked={group.selected.includes(option.value)}
                        onCheckedChange={(checked) => {
                          group.onChange(
                            checked
                              ? [...group.selected, option.value]
                              : group.selected.filter((v) => v !== option.value),
                          );
                        }}
                      />
                      <span className="flex-1">{option.label}</span>
                      <span className="text-[11px] text-muted">{option.count}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Flyout>

      {visibleGroups.flatMap((group) =>
        group.selected.map((value) => (
          <span
            key={`${group.title}:${value}`}
            className="flex items-center gap-1 rounded-md border border-primary/40 bg-accent py-0.5 pr-2 pl-1 text-accent-foreground text-xs"
          >
            <button
              type="button"
              onClick={() => {
                group.onChange(group.selected.filter((v) => v !== value));
              }}
              aria-label={`Remover filtro ${value}`}
              className="flex items-center justify-center rounded-sm p-0.5 hover:bg-destructive/15 hover:text-destructive"
            >
              <X size={11} />
            </button>
            {group.options.find((option) => option.value === value)?.label ?? value}
          </span>
        )),
      )}
    </div>
  );
}
