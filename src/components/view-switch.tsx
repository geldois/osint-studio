"use client";

import { AlertTriangle, Network, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { evaluateFindings } from "@/lib/findings";
import { useOverlay } from "@/hooks/use-overlay";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function ViewSwitch() {
  const pathname = usePathname();
  const overlay = useOverlay();
  const findings = evaluateFindings(overlay);
  const highSeverityCount = findings.filter((f) => f.severity === "alto").length;

  return (
    <ToggleGroup
      className="flex h-8 overflow-hidden rounded-md border border-border bg-surface-2"
      orientation="horizontal"
      spacing={0}
      value={[pathname]}
    >
      <ToggleGroupItem
        nativeButton={false}
        render={<Link href="/graph" />}
        value="/graph"
        aria-label="Visualizar em grafo"
        title="Grafo"
        className="w-8 self-stretch border-border border-r dark:hover:bg-input/50 aria-pressed:bg-primary/15 aria-pressed:text-primary"
      >
        <Network size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem
        nativeButton={false}
        render={<Link href="/table" />}
        value="/table"
        aria-label="Visualizar em tabela"
        title="Tabela"
        className="w-8 self-stretch border-border border-r dark:hover:bg-input/50 aria-pressed:bg-primary/15 aria-pressed:text-primary"
      >
        <Table2 size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem
        nativeButton={false}
        render={<Link href="/dashboard" />}
        value="/dashboard"
        aria-label="Visualizar o dashboard de achados"
        title="Dashboard"
        className="relative w-8 self-stretch dark:hover:bg-input/50 aria-pressed:bg-primary/15 aria-pressed:text-primary"
      >
        <AlertTriangle size={14} />
        {findings.length > 0 ? (
          <span
            className={cn(
              "absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold",
              highSeverityCount > 0
                ? "bg-destructive text-white"
                : "bg-warning text-warning-foreground",
            )}
          >
            {findings.length > 9 ? "9+" : findings.length}
          </span>
        ) : null}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
