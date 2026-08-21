import { useMemo } from "react";
import { overlayRevisions } from "@/lib/overlay";
import { useGraphStore } from "@/store/graph";
import type { GraphSchema } from "@/types/api";

export function useOverlay() {
  const revisions = useGraphStore((s) => s.revisions);
  const selected = useGraphStore((s) => s.selected);
  const nodeOverrides = useGraphStore((s) => s.nodeOverrides);
  const edgeOverrides = useGraphStore((s) => s.edgeOverrides);

  return useMemo(() => {
    const selectedRevisions = selected
      .map((contentId) => revisions[contentId])
      .filter((revision): revision is GraphSchema => revision !== undefined);
    return overlayRevisions(selectedRevisions, nodeOverrides, edgeOverrides);
  }, [revisions, selected, nodeOverrides, edgeOverrides]);
}
