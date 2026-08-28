"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Network,
  Search,
  SquareUser,
  Table2,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpansionMenu } from "@/components/expansion-menu";
import { GroupedFilterChips } from "@/components/grouped-filter-chips";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityIcon } from "@/components/nodes/entity-icon";
import { EntityFindings } from "@/components/findings/entity-findings";
import { PossibleMatchesPanel } from "@/components/possible-matches/possible-matches-panel";
import { NodeVersionMenu, EdgeVersionMenu } from "@/components/temporal/version-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useConsumeCpf } from "@/hooks/use-consume-cpf";
import { useConsumptionHistory } from "@/hooks/use-consumption-history";
import { useExpand } from "@/hooks/use-expand";
import { useOverlay } from "@/hooks/use-overlay";
import { isMaskedCpf } from "@/lib/document";
import { edgeKey, extractLabel, nodeToRows } from "@/lib/graph-adapter";
import { translateError, visibleErrorMessages } from "@/lib/errors";
import { canFetchDocumentType, type FetchDocumentType } from "@/lib/permissions";
import {
  BATCH_CPF_OUTCOME_LABELS,
  formatCostBRL,
  KIPFLOW_CPF_COST_BRL,
} from "@/lib/pricing";
import {
  counterpartLabel,
  edgeAttributes,
  edgeTypeLabel,
  nodeTypeAccentBorder,
  nodeTypeLabel,
  relationshipsForNode,
  type NodeRelationship,
} from "@/lib/relationships";
import { cn } from "@/lib/utils";
import {
  itemsForTypeFilter,
  itemsMatchingSelection,
  typeFilterOptionsFor,
} from "@/lib/table";
import { useAuthStore } from "@/store/auth";
import { useGraphStore } from "@/store/graph";
import { useSelectionStore } from "@/store/selection";
import type { NodeType } from "@/types/api";

const RELATIONSHIPS_PAGE_SIZE = 50;

function RelationshipCard({
  relationship,
  onSelectCounterpart,
}: {
  relationship: NodeRelationship;
  onSelectCounterpart: (id: string) => void;
}) {
  const { edge, direction, counterpart } = relationship;
  const attributes = edgeAttributes(edge);

  return (
    <li className="rounded-lg border border-border bg-surface-2 p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
            direction === "outgoing"
              ? "bg-primary/15 text-primary"
              : "bg-surface text-muted",
          )}
        >
          {direction === "outgoing" ? (
            <ArrowRight size={11} />
          ) : (
            <ArrowLeft size={11} />
          )}
          {direction === "outgoing" ? "para" : "de"}
        </span>
        <span className="text-[12px] font-medium">{edgeTypeLabel(edge.type)}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          onSelectCounterpart(counterpart.id);
        }}
        className={cn(
          "flex w-full items-start gap-2 rounded-md border-2 bg-surface px-2.5 py-2 text-left transition-colors hover:bg-foreground/5",
          nodeTypeAccentBorder(counterpart.type),
        )}
      >
        <span className="mt-0.5 shrink-0 opacity-70">
          <EntityIcon nodeType={counterpart.type} size={16} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-[12px] leading-snug">
            {counterpartLabel(counterpart)}
          </span>
          <span className="text-[9px] text-muted uppercase tracking-wide">
            {nodeTypeLabel(counterpart.type)}
          </span>
        </span>
      </button>
      {attributes.length > 0 ? (
        <dl className="mt-2 space-y-0.5 pl-1">
          {attributes.map((attribute) => (
            <div key={attribute.key} className="flex gap-1.5 text-[11px] text-muted">
              <dt>{attribute.key}:</dt>
              <dd>{attribute.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

type RelationshipDirection = NodeRelationship["direction"];

const DIRECTION_LABELS: Record<RelationshipDirection, string> = {
  outgoing: "Para",
  incoming: "De",
};

function RelationshipList({ relationships }: { relationships: NodeRelationship[] }) {
  const [selectedTypes, setSelectedTypes] = useState<NodeType[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<RelationshipDirection[]>(
    [],
  );
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const selectNode = useSelectionStore((s) => s.selectNode);

  const typeOptions = useMemo(
    () => typeFilterOptionsFor(relationships, (r) => r.counterpart.type),
    [relationships],
  );
  const directionOptions = useMemo(() => {
    const countByDirection = new Map<RelationshipDirection, number>();
    for (const relationship of relationships) {
      const direction = relationship.direction;
      countByDirection.set(direction, (countByDirection.get(direction) ?? 0) + 1);
    }
    return (["outgoing", "incoming"] as const)
      .filter((direction) => countByDirection.has(direction))
      .map((direction) => ({
        value: direction,
        label: DIRECTION_LABELS[direction],
        count: countByDirection.get(direction) ?? 0,
      }));
  }, [relationships]);
  const filteredByType = useMemo(
    () => itemsForTypeFilter(relationships, (r) => r.counterpart.type, selectedTypes),
    [relationships, selectedTypes],
  );
  const filtered = useMemo(
    () =>
      itemsMatchingSelection(filteredByType, (r) => r.direction, selectedDirections),
    [filteredByType, selectedDirections],
  );
  const needle = filter.trim().toLowerCase();
  const visible =
    needle === ""
      ? filtered
      : filtered.filter((r) =>
          `${counterpartLabel(r.counterpart)} ${edgeTypeLabel(r.edge.type)}`
            .toLowerCase()
            .includes(needle),
        );

  const pageCount = Math.max(1, Math.ceil(visible.length / RELATIONSHIPS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = visible.slice(
    (currentPage - 1) * RELATIONSHIPS_PAGE_SIZE,
    currentPage * RELATIONSHIPS_PAGE_SIZE,
  );

  if (relationships.length === 0) {
    return (
      <p className="text-[12px] text-muted">Nenhum relacionamento nesta expansão.</p>
    );
  }

  return (
    <div className="-mx-3 -mb-3">
      <div className="space-y-2 bg-surface p-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
          />
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filtrar relacionamentos..."
            className="pl-7"
          />
        </div>
        <GroupedFilterChips
          groups={[
            {
              title: "Tipo",
              options: typeOptions,
              selected: selectedTypes,
              onChange: (next) => {
                setSelectedTypes(next as NodeType[]);
                setPage(1);
              },
            },
            {
              title: "Direção",
              options: directionOptions,
              selected: selectedDirections,
              onChange: (next) => {
                setSelectedDirections(next as RelationshipDirection[]);
                setPage(1);
              },
            },
          ]}
        />
      </div>
      {visible.length === 0 ? (
        <p className="p-3 text-[12px] text-muted">
          Nenhum relacionamento corresponde ao filtro.
        </p>
      ) : (
        <>
          <ul className="space-y-2 bg-surface p-3">
            {paginated.map((relationship) => (
              <RelationshipCard
                key={relationship.edge.id}
                relationship={relationship}
                onSelectCounterpart={selectNode}
              />
            ))}
          </ul>
          <div className="border-border border-t bg-surface p-3">
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}

const CONSUMPTION_HISTORY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function ConsumptionHistoryList({ cpf }: { cpf: string }) {
  const { data: records, isLoading } = useConsumptionHistory(cpf);

  if (isLoading || records === undefined || records.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 border-border border-t pt-2">
      <h4 className="text-[10px] text-muted uppercase tracking-wide">
        Histórico de consultas ({records.length})
      </h4>
      <ul className="space-y-1">
        {records.map((record) => (
          <li
            key={record.id}
            className="flex items-center justify-between gap-2 text-[11px] text-muted"
          >
            <span>
              {CONSUMPTION_HISTORY_FORMATTER.format(new Date(record.requested_at))}
            </span>
            <span>{BATCH_CPF_OUTCOME_LABELS[record.outcome]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConsumeCpfBlock({
  cpf,
  consumeCpf,
}: {
  cpf: string;
  consumeCpf: ReturnType<typeof useConsumeCpf>;
}) {
  const [force, setForce] = useState(false);
  const { estimate, estimateLoading, isPending, error, data, consume } = consumeCpf;

  const alreadyFetched = (estimate?.already_fetched.length ?? 0) > 0;
  const billableCount = force ? 1 : (estimate?.billable.length ?? 0);
  const totalBRL = billableCount * KIPFLOW_CPF_COST_BRL;
  const outcome = data?.outcomes[0];

  return (
    <div className="space-y-2">
      {alreadyFetched ? (
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <Checkbox
            checked={force}
            onCheckedChange={(checked) => {
              setForce(checked);
            }}
          />
          consultar de novo (já buscado)
        </label>
      ) : null}
      <Button
        type="button"
        className="w-full"
        disabled={estimateLoading || isPending}
        onClick={() => {
          consume(force);
        }}
      >
        {isPending
          ? "Consultando..."
          : `Consultar CPF (${estimateLoading ? "—" : formatCostBRL(totalBRL)})`}
      </Button>
      {outcome !== undefined ? (
        <p className="text-[11px] text-muted">
          {BATCH_CPF_OUTCOME_LABELS[outcome.status]}
        </p>
      ) : null}
      {error ? <p className="text-red-500 text-xs">{translateError(error)}</p> : null}
      <ConsumptionHistoryList cpf={cpf} />
    </div>
  );
}

function NodePanel({ nodeId }: { nodeId: string }) {
  const overlay = useOverlay();
  const nodeOverride = useGraphStore((s) => s.nodeOverrides[nodeId]);
  const role = useAuthStore((s) => s.role);
  const { mutate, isPending, error, data } = useExpand();
  const backgroundErrors = data ? visibleErrorMessages(data.errors) : [];
  const [menuOpen, setMenuOpen] = useState(false);

  const nodeById = new Map(overlay.nodes.map((n) => [n.id, n] as const));
  const node = nodeById.get(nodeId);
  const consumeCpf = useConsumeCpf(node?.type === "person" ? node.cpf : null);

  if (node === undefined) {
    return null;
  }

  const rows = nodeToRows(node);
  const relationships = relationshipsForNode(nodeId, overlay.edges, nodeById);
  const conflictCandidates = overlay.conflicts.nodes[nodeId] ?? [];
  const documentType: FetchDocumentType | null =
    node.type === "company" ? "cnpj" : node.type === "person" ? "cpf" : null;
  const expandableDocument =
    node.type === "company" ? node.cnpj : node.type === "person" ? node.cpf : null;
  const maskedCpf = node.type === "person" && isMaskedCpf(node.cpf);
  const canExpand =
    !maskedCpf &&
    expandableDocument !== null &&
    documentType !== null &&
    canFetchDocumentType(role, documentType);

  return (
    <ScrollArea className="h-full">
      <div className="flex items-start gap-2.5 border-border border-b p-3">
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

      <section className="border-border border-b p-3">
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

      <section className="border-border border-b p-3">
        <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
          Atributos
        </h3>
        <dl className="space-y-1 text-[12px]">
          {rows.map((row) => {
            const isDocumentRow =
              canExpand && (row.key === "cnpj" || row.key === "cpf");
            const isMaskedDocumentRow = maskedCpf && row.key === "cpf";
            return (
              <div
                key={row.key}
                className={cn(
                  "flex justify-between gap-3",
                  isDocumentRow && "relative",
                )}
              >
                <dt className="shrink-0 text-muted">{row.key}</dt>
                {isDocumentRow ? (
                  <dd className="text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setMenuOpen(true);
                      }}
                      className="break-all text-primary hover:underline disabled:opacity-50"
                    >
                      {row.value}
                    </button>
                    {menuOpen ? (
                      <ExpansionMenu
                        document={expandableDocument}
                        isPending={isPending}
                        onClose={() => {
                          setMenuOpen(false);
                        }}
                        onConfirm={(routes, force) => {
                          mutate({ document: expandableDocument, routes, force });
                          setMenuOpen(false);
                        }}
                      />
                    ) : null}
                  </dd>
                ) : isMaskedDocumentRow ? (
                  <dd
                    className="break-all text-right text-muted"
                    title="CPF mascarado — não é possível consultar diretamente. Veja as possíveis correspondências abaixo."
                  >
                    {row.value}
                  </dd>
                ) : (
                  <dd className="break-all text-right">{row.value}</dd>
                )}
              </div>
            );
          })}
        </dl>
        {error ? (
          <p className="mt-2 text-red-500 text-xs">{translateError(error)}</p>
        ) : backgroundErrors.length > 0 ? (
          <p className="mt-2 text-amber-500 text-xs">{backgroundErrors.join(" ")}</p>
        ) : null}
      </section>

      <section className="border-border border-b p-3">
        <h3 className="mb-2 text-[11px] text-muted uppercase tracking-wide">
          Relacionamentos ({relationships.length})
        </h3>
        <RelationshipList key={nodeId} relationships={relationships} />
      </section>

      {node.type === "person" ? <PossibleMatchesPanel node={node} /> : null}

      {conflictCandidates.length > 0 || nodeOverride !== undefined ? (
        <section className="border-border border-b p-3">
          <NodeVersionMenu
            nodeId={nodeId}
            conflictCandidates={conflictCandidates}
            currentOverride={nodeOverride}
          />
        </section>
      ) : null}

      {canExpand && documentType === "cpf" ? (
        <section className="border-border border-t p-3">
          <ConsumeCpfBlock cpf={expandableDocument} consumeCpf={consumeCpf} />
        </section>
      ) : null}
    </ScrollArea>
  );
}

function EdgePanel({ edgeId }: { edgeId: string }) {
  const overlay = useOverlay();
  const edgeOverride = useGraphStore((s) => s.edgeOverrides[edgeId]);

  const nodeById = new Map(overlay.nodes.map((n) => [n.id, n] as const));
  const edge = overlay.edges.find((e) => edgeKey(e) === edgeId);

  if (edge === undefined) {
    return null;
  }

  const source = nodeById.get(edge.source_id);
  const target = nodeById.get(edge.target_id);
  const attributes = edgeAttributes(edge);
  const conflictCandidates = overlay.conflicts.edges[edgeId] ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="border-border border-b p-3">
        <div className="font-medium text-sm">{edgeTypeLabel(edge.type)}</div>
        <div className="text-[11px] text-muted">relação</div>
      </div>

      <section className="border-border border-b p-3">
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

      <section className="p-3">
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

      {conflictCandidates.length > 0 || edgeOverride !== undefined ? (
        <section className="border-border border-t p-3">
          <EdgeVersionMenu
            overlayEdgeKey={edgeId}
            edgeEntityId={edge.id}
            conflictCandidates={conflictCandidates}
            currentOverride={edgeOverride}
          />
        </section>
      ) : null}
    </ScrollArea>
  );
}

type DetailPanelTab = "detalhes" | "relatorio";

const JUMP_TO_DESTINATIONS = [
  { href: "/graph", icon: Network, label: "Grafo" },
  { href: "/table", icon: Table2, label: "Tabela" },
  { href: "/dashboard", icon: AlertTriangle, label: "Dashboard" },
] as const;

function JumpToMenu({ nodeId }: { nodeId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const setFocusNode = useGraphStore((s) => s.setFocusNode);
  const destinations = JUMP_TO_DESTINATIONS.filter(
    (destination) => destination.href !== pathname,
  );

  if (destinations.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Ver em outra tela"
          >
            <ArrowUpRight size={14} />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {destinations.map((destination) => (
          <DropdownMenuItem
            key={destination.href}
            onClick={() => {
              setFocusNode(nodeId);
              router.push(destination.href);
            }}
          >
            <destination.icon size={13} />
            Ver no {destination.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyDetailsTab() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <SquareUser size={28} className="text-muted" />
      <p className="max-w-64 text-muted text-sm">
        Selecione um nó ou uma relação no Grafo, na Tabela ou no Dashboard para ver os
        detalhes aqui.
      </p>
    </div>
  );
}

export function DetailPanel() {
  const overlay = useOverlay();
  const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
  const selectedEdgeId = useSelectionStore((s) => s.selectedEdgeId);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const [tab, setTab] = useState<DetailPanelTab>("detalhes");

  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;
  const selectedEdge =
    selectedEdgeId !== null
      ? overlay.edges.find((e) => edgeKey(e) === selectedEdgeId)
      : undefined;
  const entityIds =
    selectedNodeId !== null
      ? [selectedNodeId]
      : selectedEdge !== undefined
        ? [selectedEdge.source_id, selectedEdge.target_id]
        : [];

  return (
    <aside
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 max-h-[70dvh] flex-col overflow-hidden print:hidden",
        "rounded-t-xl border border-border bg-surface pb-[env(safe-area-inset-bottom)]",
        "md:static md:z-auto md:my-2 md:mr-2 md:h-auto md:max-h-none md:shrink-0",
        "md:w-104 md:rounded-xl md:border md:shadow-lg",
        hasSelection ? "flex" : "hidden",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-border border-b bg-surface-2 p-1.5">
        <ToggleGroup
          className="flex overflow-hidden rounded-md border border-border bg-surface"
          orientation="horizontal"
          spacing={0}
          value={[tab]}
          onValueChange={(value: string[]) => {
            const next = value[0];
            if (next === "detalhes" || next === "relatorio") {
              setTab(next);
            }
          }}
        >
          <ToggleGroupItem
            value="detalhes"
            className="h-7 gap-1.5 border-border border-r px-2.5 text-[12px]"
          >
            <SquareUser size={13} />
            Detalhes
          </ToggleGroupItem>
          <ToggleGroupItem value="relatorio" className="h-7 gap-1.5 px-2.5 text-[12px]">
            <FileText size={13} />
            Relatório
          </ToggleGroupItem>
        </ToggleGroup>
        {hasSelection ? (
          <div className="flex items-center gap-0.5">
            {selectedNodeId !== null ? <JumpToMenu nodeId={selectedNodeId} /> : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={clearSelection}
              aria-label="Limpar seleção"
            >
              <X size={14} />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "relatorio" ? (
          <EntityFindings entityIds={entityIds} />
        ) : selectedNodeId !== null ? (
          <NodePanel nodeId={selectedNodeId} />
        ) : selectedEdgeId !== null ? (
          <EdgePanel edgeId={selectedEdgeId} />
        ) : (
          <EmptyDetailsTab />
        )}
      </div>
    </aside>
  );
}
