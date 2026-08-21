"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useOverlay } from "@/hooks/use-overlay";
import { isMaskedCpf } from "@/lib/document";
import { extractLabel } from "@/lib/graph-adapter";
import { useTableSelectionStore } from "@/store/table-selection";
import type { PersonNode } from "@/types/api";

interface Candidate {
  candidate: PersonNode;
  confidence: string;
}

export function PossibleMatchesPanel({ node }: { node: PersonNode }) {
  const overlay = useOverlay();
  const selectedIds = useTableSelectionStore((s) => s.selectedIds);
  const toggle = useTableSelectionStore((s) => s.toggle);

  const nodeById = new Map(overlay.nodes.map((n) => [n.id, n] as const));

  const candidates: Candidate[] = overlay.edges
    .filter(
      (edge) =>
        edge.type === "possibly_matches" &&
        (edge.source_id === node.id || edge.target_id === node.id),
    )
    .flatMap((edge) => {
      if (edge.type !== "possibly_matches") {
        return [];
      }
      const candidateId = edge.source_id === node.id ? edge.target_id : edge.source_id;
      const candidate = nodeById.get(candidateId);
      return candidate?.type === "person"
        ? [{ candidate, confidence: edge.confidence }]
        : [];
    });

  if (candidates.length === 0) {
    return null;
  }

  return (
    <section className="border-border border-b p-4">
      <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
        Possíveis correspondências ({candidates.length})
      </h3>
      <ul className="space-y-1.5">
        {candidates.map(({ candidate, confidence }) => {
          const masked = isMaskedCpf(candidate.cpf);
          return (
            <li key={candidate.id} className="flex items-center gap-2 text-[12px]">
              {masked ? (
                <span className="w-4 shrink-0" />
              ) : (
                <Checkbox
                  checked={selectedIds.has(candidate.id)}
                  onCheckedChange={() => {
                    toggle(candidate.id);
                  }}
                />
              )}
              <span className="min-w-0 flex-1 truncate">{extractLabel(candidate)}</span>
              <span className="shrink-0 text-muted">
                {(Number(confidence) * 100).toFixed(0)}%
              </span>
              <span
                className={`shrink-0 rounded-sm px-1 text-[9px] uppercase ${
                  masked
                    ? "bg-white/10 text-muted"
                    : "bg-emerald-500/20 text-emerald-500"
                }`}
              >
                {masked ? "mascarado" : "completo"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
