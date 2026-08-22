import { isConsumableCpf } from "@/lib/document";
import { nodeTypePluralLabel } from "@/lib/relationships";
import type { ApiNode, NodeType } from "@/types/api";

export interface TypeFilterOption {
  count: number;
  label: string;
  value: NodeType;
}

export function typeFilterOptionsFor<T>(
  items: T[],
  typeOf: (item: T) => NodeType,
): TypeFilterOption[] {
  const countByType = new Map<NodeType, number>();
  for (const item of items) {
    const nodeType = typeOf(item);
    countByType.set(nodeType, (countByType.get(nodeType) ?? 0) + 1);
  }

  return [...countByType.entries()]
    .map(([nodeType, count]): TypeFilterOption => ({
      count,
      label: nodeTypePluralLabel(nodeType),
      value: nodeType,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function itemsMatchingSelection<T, V>(
  items: T[],
  valueOf: (item: T) => V,
  selected: V[],
): T[] {
  if (selected.length === 0) {
    return items;
  }
  const selectedValues = new Set(selected);
  return items.filter((item) => selectedValues.has(valueOf(item)));
}

export function itemsForTypeFilter<T>(
  items: T[],
  typeOf: (item: T) => NodeType,
  selected: NodeType[],
): T[] {
  return itemsMatchingSelection(items, typeOf, selected);
}

export function typeFilterOptions(nodes: ApiNode[]): TypeFilterOption[] {
  return typeFilterOptionsFor(nodes, (node) => node.type);
}

export function nodesForTypeFilter(nodes: ApiNode[], selected: NodeType[]): ApiNode[] {
  return itemsForTypeFilter(nodes, (node) => node.type, selected);
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
