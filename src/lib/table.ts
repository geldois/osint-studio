import { isConsumableCpf } from "@/lib/document";
import { nodeTypePluralLabel } from "@/lib/relationships";
import type { ApiNode, NodeType } from "@/types/api";

export interface TypedTab {
  count: number;
  label: string;
  nodeType: NodeType | "all";
}

export function typedTabs(nodes: ApiNode[]): TypedTab[] {
  const countByType = new Map<NodeType, number>();
  for (const node of nodes) {
    countByType.set(node.type, (countByType.get(node.type) ?? 0) + 1);
  }

  const typeTabs = [...countByType.entries()]
    .map(([nodeType, count]): TypedTab => ({
      count,
      label: nodeTypePluralLabel(nodeType),
      nodeType,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return [{ count: nodes.length, label: "Todos", nodeType: "all" }, ...typeTabs];
}

export function nodesForTab(nodes: ApiNode[], tab: NodeType | "all"): ApiNode[] {
  return tab === "all" ? nodes : nodes.filter((node) => node.type === tab);
}

export function consumableSelection(
  nodes: ApiNode[],
  selectedIds: Set<string>,
): { cpfs: string[]; skippedIds: string[] } {
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
  const cpfs = new Set<string>();
  const skippedIds: string[] = [];

  for (const id of selectedIds) {
    const node = nodeById.get(id);
    if (node?.type === "person" && isConsumableCpf(node.cpf)) {
      cpfs.add(node.cpf);
    } else {
      skippedIds.push(id);
    }
  }

  return { cpfs: [...cpfs], skippedIds };
}
