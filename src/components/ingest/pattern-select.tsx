"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Flyout } from "@/components/flyout";
import type { TextPatternCatalog } from "@/types/api";

const PATTERN_NODE_TYPE_LABELS: Record<string, string> = {
  Address: "Endereço",
  Company: "Empresa",
  Person: "Pessoa",
};

export function patternNodeTypeLabel(nodeType: string): string {
  return PATTERN_NODE_TYPE_LABELS[nodeType] ?? nodeType;
}

export interface PatternSelectProps {
  catalog: TextPatternCatalog;
  value: string[];
  onChange: (patterns: string[]) => void;
}

export function PatternSelect({ catalog, value, onChange }: PatternSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(name: string, checked: boolean): void {
    onChange(checked ? [...value, name] : value.filter((pattern) => pattern !== name));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Flyout
        open={open}
        onOpenChange={setOpen}
        title="Padrões de extração"
        align="start"
        trigger={
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs font-medium hover:bg-white/10"
          >
            Padrões ({value.length} ativo{value.length === 1 ? "" : "s"})
          </button>
        }
      >
        <ul className="max-h-72 space-y-1 overflow-auto p-1.5">
          {catalog.patterns.map((pattern) => (
            <li key={pattern.name}>
              <label className="flex items-center gap-2 rounded-md p-1.5 text-[12px] hover:bg-surface-2">
                <Checkbox
                  checked={value.includes(pattern.name)}
                  onCheckedChange={(checked) => {
                    toggle(pattern.name, checked);
                  }}
                />
                {pattern.name}
                <span className="text-muted text-xs">
                  {patternNodeTypeLabel(pattern.node_type)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Flyout>

      {value.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 py-1">
          {value.map((name) => (
            <Badge key={name} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
