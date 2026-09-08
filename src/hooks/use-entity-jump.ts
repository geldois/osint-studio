import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";

export function useEntityJump() {
  const selectNode = useSelectionStore((s) => s.selectNode);
  const setFocusNode = useGraphStore((s) => s.setFocusNode);
  return (nodeId: string) => {
    setFocusNode(nodeId);
    selectNode(nodeId);
  };
}
