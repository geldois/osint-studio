"use client";

/* eslint-disable @typescript-eslint/no-deprecated */

import { Link2, Printer } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartAxisTick,
  type ChartAxisTickProps,
} from "@/components/dashboard/chart-axis-tick";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SeverityBadge } from "@/components/findings/severity-badge";
import { FindingsPanel } from "@/components/findings/findings-panel";
import { DashboardStat } from "@/components/dashboard/dashboard-stat";
import { useOverlay } from "@/hooks/use-overlay";
import { extractLabel } from "@/lib/graph-adapter";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  countBySeverity,
  evaluateFindings,
  type FindingCategory,
  type FindingSeverity,
} from "@/lib/findings";
import {
  type CoverageKey,
  deepestOwnershipChains,
  edgeTypeBreakdown,
  investigationCoverage,
  possibleMatchPairs,
  providerBreakdown,
  riskRankedEntities,
  sanctionsByOrgan,
  sectorBreakdown,
  totalFineAmount,
} from "@/lib/graph-stats";
import { edgeTypeLabel } from "@/lib/relationships";
import { useEntityJump } from "@/hooks/use-entity-jump";
import { useFindingsFilterStore } from "@/store/findings-filter";

const GENERATED_AT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const CHART_COLOR_VARS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

function chartColorAt(index: number): string {
  return CHART_COLOR_VARS[index % CHART_COLOR_VARS.length] ?? "var(--color-chart-1)";
}

const SEVERITY_ORDER: FindingSeverity[] = ["alto", "medio", "baixo"];

const SEVERITY_CONFIG: ChartConfig = {
  alto: { color: "var(--color-destructive)", label: "Alto" },
  baixo: { color: "var(--color-muted)", label: "Baixo" },
  medio: { color: "var(--color-warning)", label: "Médio" },
};

function SeverityDonut({ counts }: { counts: Record<FindingSeverity, number> }) {
  const setSeverities = useFindingsFilterStore((s) => s.setSeverities);
  const data = SEVERITY_ORDER.filter((severity) => counts[severity] > 0).map(
    (severity) => ({ count: counts[severity], severity }),
  );

  return (
    <DashboardChartCard
      title="Achados por severidade"
      isEmpty={data.length === 0}
      emptyMessage="Sem achados."
    >
      <ChartContainer config={SEVERITY_CONFIG} className="size-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="severity"
            innerRadius={48}
            strokeWidth={4}
          >
            {data.map((entry) => (
              <Cell
                key={entry.severity}
                fill={`var(--color-${entry.severity})`}
                className="cursor-pointer"
                onClick={() => {
                  setSeverities([entry.severity]);
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </DashboardChartCard>
  );
}

const CATEGORY_ORDER: FindingCategory[] = [
  "fraude",
  "processo_judicial",
  "conflito_interesse",
  "risco_associacao",
  "identidade",
  "qualidade_dado",
];

const CATEGORY_CHART_COLORS: Record<FindingCategory, string> = {
  conflito_interesse: "var(--color-chart-3)",
  fraude: "var(--color-chart-5)",
  identidade: "var(--color-chart-2)",
  processo_judicial: "var(--color-chart-6)",
  qualidade_dado: "var(--color-chart-1)",
  risco_associacao: "var(--color-chart-4)",
};

const CATEGORY_CONFIG: ChartConfig = Object.fromEntries(
  CATEGORY_ORDER.map((category) => [
    category,
    { color: CATEGORY_CHART_COLORS[category], label: categoryLabel(category) },
  ]),
);

function CategoryBars({ findings }: { findings: ReturnType<typeof evaluateFindings> }) {
  const setCategories = useFindingsFilterStore((s) => s.setCategories);
  const data = useMemo(() => {
    const counts = new Map<FindingCategory, number>();
    for (const finding of findings) {
      counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
    }
    return CATEGORY_ORDER.filter((category) => (counts.get(category) ?? 0) > 0).map(
      (category) => ({
        category,
        count: counts.get(category) ?? 0,
        label: categoryLabel(category),
      }),
    );
  }, [findings]);

  return (
    <DashboardChartCard
      title="Achados por categoria"
      isEmpty={data.length === 0}
      emptyMessage="Sem achados."
    >
      <ChartContainer config={CATEGORY_CONFIG} className="size-full">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={<ChartAxisTick />}
            width={140}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={4}>
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={`var(--color-${entry.category})`}
                className="cursor-pointer"
                onClick={() => {
                  setCategories([entry.category]);
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </DashboardChartCard>
  );
}

function PossibleMatchesCard({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const pairs = useMemo(() => possibleMatchPairs(overlay), [overlay]);
  const jumpTo = useEntityJump();

  return (
    <DashboardChartCard
      title="Possíveis identidades"
      isEmpty={pairs.length === 0}
      emptyMessage="Nenhuma possível correspondência de identidade."
    >
      <ul className="space-y-2">
        {pairs.map((pair) => (
          <li key={`${pair.a.id}:${pair.b.id}`} className="min-w-0 text-[12px]">
            <button
              type="button"
              onClick={() => {
                jumpTo(pair.a.id);
              }}
              className="flex w-full items-center gap-1.5 text-left hover:underline"
            >
              <Link2 size={12} className="shrink-0 text-muted" />
              <span className="min-w-0 truncate">
                {extractLabel(pair.a)} ≈ {extractLabel(pair.b)}
              </span>
              <span className="ml-auto shrink-0 text-muted">
                {pair.confidencePercent}%
              </span>
            </button>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full",
                  pair.confidencePercent >= 80 ? "bg-destructive" : "bg-warning",
                )}
                style={{ width: `${String(pair.confidencePercent)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </DashboardChartCard>
  );
}

const SANCTION_ORGAN_CONFIG = {
  count: { color: "var(--color-chart-6)", label: "Sanções" },
} satisfies ChartConfig;

function SanctionOrganBars({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const breakdown = useMemo(() => sanctionsByOrgan(overlay), [overlay]);
  const { total, unparsedCount } = useMemo(() => totalFineAmount(overlay), [overlay]);

  return (
    <DashboardChartCard
      title="Sanções por órgão"
      isEmpty={breakdown.length === 0}
      emptyMessage="Nenhuma sanção."
      footer={
        total > 0 ? (
          <p className="mt-2 text-[11px] text-muted">
            Total em multas:{" "}
            <span className="text-foreground">{BRL_FORMATTER.format(total)}</span>
            {unparsedCount > 0
              ? ` (+${String(unparsedCount)} valor(es) não legível(is) no total)`
              : null}
          </p>
        ) : null
      }
    >
      <ChartContainer config={SANCTION_ORGAN_CONFIG} className="size-full">
        <BarChart data={breakdown} layout="vertical" margin={{ left: 12, right: 12 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="organ"
            width={60}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </DashboardChartCard>
  );
}

function OwnershipChainCard({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const chains = useMemo(() => deepestOwnershipChains(overlay, 3), [overlay]);
  const deepest = chains[0];
  const jumpTo = useEntityJump();

  return (
    <DashboardChartCard
      title="Cadeia societária mais profunda"
      isEmpty={deepest === undefined}
      emptyMessage="Nenhuma cadeia de posse entre empresas."
    >
      {deepest !== undefined ? (
        <>
          <p className="font-bold text-2xl">{deepest.depth}</p>
          <p className="mb-2 text-[11px] text-muted">
            nível(is) acima de {extractLabel(deepest.company)}
          </p>
          <ul className="space-y-1">
            {chains.map((chain) => (
              <li key={chain.company.id}>
                <button
                  type="button"
                  onClick={() => {
                    jumpTo(chain.company.id);
                  }}
                  className="flex w-full min-w-0 items-center justify-between gap-2 text-[12px] hover:underline"
                >
                  <span className="min-w-0 truncate">
                    {extractLabel(chain.company)}
                  </span>
                  <span className="shrink-0 text-muted">{chain.depth} elo(s)</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </DashboardChartCard>
  );
}

const SECTOR_CONFIG = {
  count: { color: "var(--color-chart-4)", label: "Empresas" },
} satisfies ChartConfig;

function SectorBars({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const data = useMemo(() => sectorBreakdown(overlay), [overlay]);

  return (
    <DashboardChartCard
      title="Distribuição por setor (CNAE)"
      isEmpty={data.length === 0}
      emptyMessage="Nenhuma empresa com CNAE identificado."
    >
      <ChartContainer config={SECTOR_CONFIG} className="size-full">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey={(entry: (typeof data)[number]) => entry.cnae.id}
            tick={(props: ChartAxisTickProps) => {
              const value = props.payload?.value ?? "";
              const entry = data.find((d) => d.cnae.id === value);
              const label = entry === undefined ? value : extractLabel(entry.cnae);
              return <ChartAxisTick {...props} payload={{ value: label }} />;
            }}
            width={140}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </DashboardChartCard>
  );
}

function ProviderBreakdownCard({
  overlay,
}: {
  overlay: ReturnType<typeof useOverlay>;
}) {
  const data = useMemo(() => providerBreakdown(overlay), [overlay]);
  const config: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        data.map((entry, index) => [
          entry.provider,
          { color: chartColorAt(index), label: entry.provider },
        ]),
      ),
    [data],
  );

  return (
    <DashboardChartCard
      title="Distribuição por fonte"
      isEmpty={data.length === 0}
      emptyMessage="Nenhuma entidade com fonte identificada."
    >
      <ChartContainer config={config} className="size-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="provider"
            innerRadius={48}
            strokeWidth={4}
          >
            {data.map((entry, index) => (
              <Cell key={entry.provider} fill={chartColorAt(index)} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </DashboardChartCard>
  );
}

function EdgeTypeBreakdownCard({
  overlay,
}: {
  overlay: ReturnType<typeof useOverlay>;
}) {
  const data = useMemo(() => {
    const countByLabel = new Map<string, number>();
    for (const entry of edgeTypeBreakdown(overlay)) {
      const label = edgeTypeLabel(entry.type);
      countByLabel.set(label, (countByLabel.get(label) ?? 0) + entry.count);
    }
    return [...countByLabel.entries()]
      .map(([label, count]) => ({ count, label }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  }, [overlay]);
  const config: ChartConfig = {
    count: { color: "var(--color-chart-2)", label: "Relações" },
  };

  return (
    <DashboardChartCard
      title="Tipos de relação"
      isEmpty={data.length === 0}
      emptyMessage="Nenhuma relação neste grafo."
    >
      <ChartContainer config={config} className="size-full">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={<ChartAxisTick />}
            width={140}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </DashboardChartCard>
  );
}

const COVERAGE_LABELS: Record<CoverageKey, string> = {
  legal_process: "Processos",
  political_exposure: "PEP",
  sanction: "Sanções",
};

const COVERAGE_COLORS: Record<CoverageKey, string> = {
  legal_process: "var(--color-chart-6)",
  political_exposure: "var(--color-chart-4)",
  sanction: "var(--color-chart-5)",
};

function CoverageRadialCard({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const metrics = useMemo(() => investigationCoverage(overlay), [overlay]);
  const hasEligible = overlay.nodes.some(
    (node) => node.type === "person" || node.type === "company",
  );
  const data = metrics.map((metric) => ({
    fill: COVERAGE_COLORS[metric.key],
    key: metric.key,
    label: COVERAGE_LABELS[metric.key],
    percent: metric.percent,
  }));
  const config: ChartConfig = Object.fromEntries(
    data.map((entry) => [entry.key, { color: entry.fill, label: entry.label }]),
  );

  return (
    <DashboardChartCard
      title="Cobertura da investigação"
      isEmpty={!hasEligible}
      emptyMessage="Nenhuma pessoa ou empresa investigada ainda."
      footer={
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          {data.map((entry) => (
            <li key={entry.key} className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              {entry.label}: {entry.percent}%
            </li>
          ))}
        </ul>
      }
    >
      <ChartContainer config={config} className="size-full">
        <RadialBarChart
          data={data}
          innerRadius="30%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <PolarGrid gridType="circle" radialLines={false} />
          <RadialBar dataKey="percent" background cornerRadius={4}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
          </RadialBar>
        </RadialBarChart>
      </ChartContainer>
    </DashboardChartCard>
  );
}

function RiskRankedEntitiesCard({
  findings,
  overlay,
}: {
  findings: ReturnType<typeof evaluateFindings>;
  overlay: ReturnType<typeof useOverlay>;
}) {
  const ranked = useMemo(
    () => riskRankedEntities(overlay, findings, 6),
    [overlay, findings],
  );
  const jumpTo = useEntityJump();

  return (
    <DashboardChartCard
      title="Entidades de maior risco"
      isEmpty={ranked.length === 0}
      emptyMessage="Nenhuma entidade com achados ainda."
    >
      <ul className="space-y-1.5">
        {ranked.map((entry) => (
          <li key={entry.node.id}>
            <button
              type="button"
              onClick={() => {
                jumpTo(entry.node.id);
              }}
              className="flex w-full min-w-0 items-center gap-2 rounded-md p-1 text-left text-[12px] hover:bg-foreground/5"
            >
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.topSeverity !== null ? (
                <SeverityBadge severity={entry.topSeverity} />
              ) : null}
              <span className="shrink-0 text-muted">{entry.score}</span>
            </button>
          </li>
        ))}
      </ul>
    </DashboardChartCard>
  );
}

interface DashboardHeaderProps {
  highRiskCount: number;
  investigatedCount: number;
  legalProcessCount: number;
  overlay: ReturnType<typeof useOverlay>;
  pepCount: number;
}

function DashboardHeader({
  highRiskCount,
  investigatedCount,
  legalProcessCount,
  overlay,
  pepCount,
}: DashboardHeaderProps) {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const roots = [...overlay.roots]
    .map((id) => nodeById.get(id))
    .filter((node): node is NonNullable<typeof node> => node !== undefined)
    .filter((node) => node.type !== "text_source");

  return (
    <div className="border-border border-b">
      <div className="flex items-start justify-between gap-3 p-3">
        <div>
          <h1 className="font-medium text-lg">Relatório de Achados</h1>
          <p className="text-[12px] text-muted">
            Gerado em {GENERATED_AT_FORMATTER.format(new Date())} · OSINT Studio
          </p>
          {roots.length > 0 ? (
            <p className="mt-1 text-[12px] text-muted">
              <span className="font-medium text-foreground">Investigado:</span>{" "}
              {roots.map((node) => extractLabel(node)).join(", ")}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="print:hidden"
          onClick={() => {
            window.print();
          }}
        >
          <Printer size={13} />
          Imprimir
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 pt-0 md:grid-cols-4">
        <DashboardStat
          label="Achados de alto risco"
          value={String(highRiskCount)}
          tone={highRiskCount > 0 ? "destructive" : "default"}
        />
        <DashboardStat
          label="Exposição política (PEP)"
          value={String(pepCount)}
          tone={pepCount > 0 ? "warning" : "default"}
        />
        <DashboardStat
          label="Processos judiciais"
          value={String(legalProcessCount)}
          tone={legalProcessCount > 0 ? "warning" : "default"}
        />
        <DashboardStat
          label="Entidades investigadas"
          value={String(investigatedCount)}
        />
      </div>
    </div>
  );
}

export function FindingsDashboard() {
  const overlay = useOverlay();
  const findings = useMemo(() => evaluateFindings(overlay), [overlay]);
  const counts = countBySeverity(findings);
  const resetFindingsFilter = useFindingsFilterStore((s) => s.reset);
  const pepCount = overlay.edges.filter(
    (edge) => edge.type === "person_has_political_exposure",
  ).length;
  const legalProcessCount = overlay.edges.filter(
    (edge) =>
      edge.type === "person_is_party_in_legal_process" ||
      edge.type === "company_is_party_in_legal_process",
  ).length;
  const investigatedCount = overlay.nodes.filter(
    (node) => node.type === "person" || node.type === "company",
  ).length;

  useEffect(() => {
    resetFindingsFilter();
  }, [resetFindingsFilter]);

  return (
    <div className="flex h-full flex-col overflow-y-auto print:h-auto print:overflow-visible">
      <DashboardHeader
        highRiskCount={counts.alto}
        investigatedCount={investigatedCount}
        legalProcessCount={legalProcessCount}
        overlay={overlay}
        pepCount={pepCount}
      />
      <div className="p-3">
        <h2 className="mb-2 font-medium text-muted text-xs uppercase">
          Panorama de risco
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <SeverityDonut counts={counts} />
          <CategoryBars findings={findings} />
          <SanctionOrganBars overlay={overlay} />
        </div>
      </div>
      <div className="p-3 pt-0">
        <h2 className="mb-2 font-medium text-muted text-xs uppercase">
          Rede e identidade
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <RiskRankedEntitiesCard findings={findings} overlay={overlay} />
          <PossibleMatchesCard overlay={overlay} />
          <OwnershipChainCard overlay={overlay} />
          <SectorBars overlay={overlay} />
        </div>
      </div>
      <div className="p-3 pt-0">
        <h2 className="mb-2 font-medium text-muted text-xs uppercase">
          Cobertura e fontes
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <ProviderBreakdownCard overlay={overlay} />
          <EdgeTypeBreakdownCard overlay={overlay} />
          <CoverageRadialCard overlay={overlay} />
        </div>
      </div>
      <div className="min-h-0 flex-1 border-border border-t">
        <FindingsPanel findings={findings} />
      </div>
    </div>
  );
}
