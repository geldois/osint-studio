"use client";

import { X } from "lucide-react";
import { EntityIcon } from "@/components/nodes/entity-icon";
import { useExpand } from "@/hooks/use-expand";
import { edgeKey, extractLabel, nodeToRows } from "@/lib/graph-adapter";
import { translateError, visibleErrorMessages } from "@/lib/errors";
import { canFetchDocumentType, type FetchDocumentType } from "@/lib/permissions";
import {
  counterpartLabel,
  edgeAttributes,
  edgeTypeLabel,
  nodeTypeLabel,
  relationshipsForNode,
} from "@/lib/relationships";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";

function NodePanel({ nodeId }: { nodeId: string }) {
  const rawNodes = useGraphStore((s) => s.rawNodes);
  const rawEdges = useGraphStore((s) => s.rawEdges);
  const selectNode = useSelectionStore((s) => s.selectNode);
  const role = useAuthStore((s) => s.role);
  const { mutate, isPending, error, data } = useExpand();
  const backgroundErrors = data ? visibleErrorMessages(data.errors) : [];

  const nodeById = new Map(rawNodes.map((n) => [n.id, n] as const));
  const node = nodeById.get(nodeId);

  if (node === undefined) {
    return null;
  }

  const rows = nodeToRows(node);
  const relationships = relationshipsForNode(nodeId, rawEdges, nodeById);
  const documentType: FetchDocumentType | null =
    node.type === "company" ? "cnpj" : node.type === "person" ? "cpf" : null;
  const expandableDocument =
    node.type === "company" ? node.cnpj : node.type === "person" ? node.cpf : null;
  const canExpand =
    expandableDocument !== null &&
    documentType !== null &&
    canFetchDocumentType(role, documentType);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-start gap-2.5 border-border border-b p-4">
        <span className="mt-0.5 shrink-0 opacity-70">
          <EntityIcon nodeType={node.type} size={18} />
        </span>
        <div className="min-w-0">
          <div className="truncate font-medium text-sm">{extractLabel(node)}</div>
          <div className="text-[11px] text-muted uppercase">
            {nodeTypeLabel(node.type)}
          </div>
        </div>
      </div>

      <section className="border-border border-b p-4">
        <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
          Identificação
        </h3>
        <dl className="space-y-1 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">id</dt>
            <dd className="truncate text-right">{node.id}</dd>
          </div>
        </dl>
      </section>

      <section className="border-border border-b p-4">
        <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
          Atributos
        </h3>
        <dl className="space-y-1 text-[12px]">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted">{row.key}</dt>
              <dd className="break-all text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-border border-b p-4">
        <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
          Relacionamentos ({relationships.length})
        </h3>
        {relationships.length === 0 ? (
          <p className="text-[12px] text-muted">
            Nenhum relacionamento nesta expansão.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {relationships.map(({ edge, direction, counterpart }) => {
              const attributes = edgeAttributes(edge);
              return (
                <li key={edge.id} className="text-[12px]">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-50">
                      {direction === "outgoing" ? "→" : "←"}
                    </span>
                    <span className="text-muted">{edgeTypeLabel(edge.type)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      selectNode(counterpart.id);
                    }}
                    className="flex items-center gap-1.5 pl-4 text-left font-medium hover:underline"
                  >
                    <span className="shrink-0 opacity-70">
                      <EntityIcon nodeType={counterpart.type} size={12} />
                    </span>
                    {counterpartLabel(counterpart)}
                  </button>
                  {attributes.length > 0 ? (
                    <dl className="mt-1 space-y-0.5 pl-4">
                      {attributes.map((attribute) => (
                        <div
                          key={attribute.key}
                          className="flex gap-1.5 text-[11px] text-muted"
                        >
                          <dt>{attribute.key}:</dt>
                          <dd>{attribute.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canExpand ? (
        <div className="space-y-2 p-4">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              mutate({ document: expandableDocument });
            }}
            className="w-full rounded border border-border bg-surface px-3 py-1.5 font-medium text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {isPending ? "Expandindo..." : "Expandir relacionamentos"}
          </button>
          {error ? (
            <p className="text-red-500 text-xs">{translateError(error)}</p>
          ) : backgroundErrors.length > 0 ? (
            <p className="text-amber-500 text-xs">{backgroundErrors.join(" ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EdgePanel({ edgeId }: { edgeId: string }) {
  const rawNodes = useGraphStore((s) => s.rawNodes);
  const rawEdges = useGraphStore((s) => s.rawEdges);

  const nodeById = new Map(rawNodes.map((n) => [n.id, n] as const));
  const edge = rawEdges.find((e) => edgeKey(e) === edgeId);

  if (edge === undefined) {
    return null;
  }

  const source = nodeById.get(edge.source_id);
  const target = nodeById.get(edge.target_id);
  const attributes = edgeAttributes(edge);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-border border-b p-4">
        <div className="font-medium text-sm">{edgeTypeLabel(edge.type)}</div>
        <div className="text-[11px] text-muted">relação</div>
      </div>

      <section className="border-border border-b p-4">
        <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
          Entidades
        </h3>
        <dl className="space-y-1 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">origem</dt>
            <dd className="truncate text-right">
              {source !== undefined ? extractLabel(source) : edge.source_id}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">destino</dt>
            <dd className="truncate text-right">
              {target !== undefined ? extractLabel(target) : edge.target_id}
            </dd>
          </div>
        </dl>
      </section>

      <section className="p-4">
        <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
          Atributos
        </h3>
        {attributes.length === 0 ? (
          <p className="text-[12px] text-muted">
            Esta relação não possui atributos adicionais.
          </p>
        ) : (
          <dl className="space-y-1 text-[12px]">
            {attributes.map((attribute) => (
              <div key={attribute.key} className="flex justify-between gap-3">
                <dt className="text-muted">{attribute.key}</dt>
                <dd className="text-right">{attribute.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}

export function DetailPanel() {
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const selectedEdgeId = useSelectionStore((s) => s.selectedEdgeId);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  if (selectedNodeId === null && selectedEdgeId === null) {
    return null;
  }

  return (
    <aside className="relative h-full w-80 shrink-0 border-border border-l bg-surface">
      <button
        type="button"
        onClick={clearSelection}
        aria-label="Fechar painel"
        className="absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-white/10 hover:text-foreground"
      >
        <X size={14} />
      </button>
      {selectedNodeId !== null ? <NodePanel nodeId={selectedNodeId} /> : null}
      {selectedEdgeId !== null ? <EdgePanel edgeId={selectedEdgeId} /> : null}
    </aside>
  );
}
