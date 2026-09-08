"use client";

import { useMemo } from "react";
import { FindingsPanel } from "@/components/findings/findings-panel";
import { useOverlay } from "@/hooks/use-overlay";
import { evaluateFindings } from "@/lib/findings";

export function EntityFindings({ entityIds }: { entityIds: string[] }) {
  const overlay = useOverlay();
  const filtered = useMemo(
    () =>
      evaluateFindings(overlay).filter((finding) =>
        finding.nodeIds.some((id) => entityIds.includes(id)),
      ),
    [overlay, entityIds],
  );

  return <FindingsPanel findings={filtered} />;
}
