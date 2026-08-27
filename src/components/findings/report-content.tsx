"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOverlay } from "@/hooks/use-overlay";
import {
  categoryLabel,
  countBySeverity,
  evaluateFindings,
  severityLabel,
  type Finding,
  type FindingSeverity,
} from "@/lib/findings";
import { extractLabel } from "@/lib/graph-adapter";
import { cn } from "@/lib/utils";

const GENERATED_AT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

const STAT_TILE_STYLES: Record<FindingSeverity, string> = {
  alto: "border-destructive/40 bg-destructive/10 text-destructive",
  baixo: "border-border bg-surface-2 text-muted",
  medio: "border-warning/40 bg-warning/15 text-warning",
};

function StatTile({ severity, count }: { severity: FindingSeverity; count: number }) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-3",
        STAT_TILE_STYLES[severity],
      )}
    >
      <span className="font-bold text-2xl">{count}</span>
      <span className="text-[11px] uppercase tracking-wide">
        {severityLabel(severity)}
      </span>
    </div>
  );
}

function ReportFindingRow({
  finding,
  entityLabels,
}: {
  finding: Finding;
  entityLabels: string[];
}) {
  return (
    <li className="border-border border-b py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-[13px] leading-snug">{finding.title}</span>
        <span className="shrink-0 text-[10px] text-muted uppercase tracking-wide">
          {categoryLabel(finding.category)}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-muted">{finding.description}</p>
      {entityLabels.length > 0 ? (
        <p className="mt-1 text-[11px] text-muted">
          <span className="font-medium">Entidades:</span> {entityLabels.join(", ")}
        </p>
      ) : null}
    </li>
  );
}

export function ReportContent() {
  const overlay = useOverlay();

  const findings = evaluateFindings(overlay);
  const counts = countBySeverity(findings);
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const roots = [...overlay.roots]
    .map((id) => nodeById.get(id))
    .filter((node): node is NonNullable<typeof node> => node !== undefined)
    .filter((node) => node.type !== "text_source");

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="p-3">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Relatório de Achados</h2>
            <p className="text-[12px] text-muted">
              Gerado em {GENERATED_AT_FORMATTER.format(new Date())} · OSINT Studio
            </p>
          </div>

          {roots.length > 0 ? (
            <p className="mb-4 text-[12px] text-muted">
              <span className="font-medium text-foreground">Investigado:</span>{" "}
              {roots.map((node) => extractLabel(node)).join(", ")}
            </p>
          ) : null}

          <div className="mb-5 flex gap-2">
            <StatTile severity="alto" count={counts.alto} />
            <StatTile severity="medio" count={counts.medio} />
            <StatTile severity="baixo" count={counts.baixo} />
          </div>

          {findings.length === 0 ? (
            <p className="text-[12px] text-muted">
              Nenhum achado identificado neste grafo até o momento.
            </p>
          ) : (
            <ul>
              {findings.map((finding) => (
                <ReportFindingRow
                  key={finding.id}
                  finding={finding}
                  entityLabels={finding.nodeIds
                    .map((id) => nodeById.get(id))
                    .filter(
                      (node): node is NonNullable<typeof node> => node !== undefined,
                    )
                    .map((node) => extractLabel(node))}
                />
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>

      <div className="flex shrink-0 justify-end border-border border-t bg-surface p-2 print:hidden">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            window.print();
          }}
        >
          <Printer size={13} />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
