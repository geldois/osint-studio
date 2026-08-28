"use client";

/* eslint-disable @typescript-eslint/no-deprecated */

import { Link2, Printer } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
  deepestOwnershipChains,
  possibleMatchPairs,
  sanctionsByOrgan,
  sectorBreakdown,
  topConnectedEntities,
  totalFineAmount,
} from "@/lib/graph-stats";

const GENERATED_AT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const SEVERITY_ORDER: FindingSeverity[] = ["alto", "medio", "baixo"];

const SEVERITY_CONFIG: ChartConfig = {
  alto: { color: "var(--color-destructive)", label: "Alto" },
  baixo: { color: "var(--color-muted)", label: "Baixo" },
  medio: { color: "var(--color-warning)", label: "Médio" },
};

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

const CENTRALITY_CONFIG = {
  degree: { color: "var(--color-chart-4)", label: "Conexões" },
} satisfies ChartConfig;

function SeverityDonut({ counts }: { counts: Record<FindingSeverity, number> }) {
  const data = SEVERITY_ORDER.filter((severity) => counts[severity] > 0).map(
    (severity) => ({ count: counts[severity], severity }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Achados por severidade</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">Sem achados.</p>
        ) : (
          <ChartContainer
            config={SEVERITY_CONFIG}
            className="mx-auto aspect-square max-h-64"
          >
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
                  <Cell key={entry.severity} fill={`var(--color-${entry.severity})`} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryBars({ findings }: { findings: ReturnType<typeof evaluateFindings> }) {
  const data = useMemo(() => {
    const counts = new Map<FindingCategory, number>();
    for (const finding of findings) {
      counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
    }
    return CATEGORY_ORDER.filter((category) => (counts.get(category) ?? 0) > 0).map(
      (category) => ({ category, count: counts.get(category) ?? 0 }),
    );
  }, [findings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Achados por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">Sem achados.</p>
        ) : (
          <ChartContainer config={CATEGORY_CONFIG} className="max-h-64 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="category"
                tickFormatter={(value: FindingCategory) => categoryLabel(value)}
                width={140}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
                {data.map((entry) => (
                  <Cell key={entry.category} fill={`var(--color-${entry.category})`} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CentralityBars({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const data = useMemo(() => topConnectedEntities(overlay, 6), [overlay]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Entidades mais conectadas</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">
            Nenhuma entidade com relacionamentos ainda.
          </p>
        ) : (
          <ChartContainer config={CENTRALITY_CONFIG} className="max-h-64 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) =>
                  value.length > 18 ? `${value.slice(0, 18)}…` : value
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="degree" fill="var(--color-degree)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function PossibleMatchesCard({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const pairs = useMemo(() => possibleMatchPairs(overlay), [overlay]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Possíveis identidades</CardTitle>
      </CardHeader>
      <CardContent>
        {pairs.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">
            Nenhuma possível correspondência de identidade.
          </p>
        ) : (
          <ul className="space-y-2">
            {pairs.map((pair) => (
              <li key={`${pair.a.id}:${pair.b.id}`} className="text-[12px]">
                <div className="flex items-center gap-1.5">
                  <Link2 size={12} className="shrink-0 text-muted" />
                  <span className="truncate">
                    {extractLabel(pair.a)} ≈ {extractLabel(pair.b)}
                  </span>
                  <span className="ml-auto shrink-0 text-muted">
                    {pair.confidencePercent}%
                  </span>
                </div>
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
        )}
      </CardContent>
    </Card>
  );
}

const SANCTION_ORGAN_CONFIG = {
  count: { color: "var(--color-chart-6)", label: "Sanções" },
} satisfies ChartConfig;

function SanctionOrganBars({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const breakdown = useMemo(() => sanctionsByOrgan(overlay), [overlay]);
  const { total, unparsedCount } = useMemo(() => totalFineAmount(overlay), [overlay]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sanções por órgão</CardTitle>
      </CardHeader>
      <CardContent>
        {breakdown.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">Nenhuma sanção.</p>
        ) : (
          <>
            <ChartContainer config={SANCTION_ORGAN_CONFIG} className="max-h-56 w-full">
              <BarChart
                data={breakdown}
                layout="vertical"
                margin={{ left: 12, right: 12 }}
              >
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
            {total > 0 ? (
              <p className="mt-2 text-[11px] text-muted">
                Total em multas:{" "}
                <span className="text-foreground">{BRL_FORMATTER.format(total)}</span>
                {unparsedCount > 0
                  ? ` (+${String(unparsedCount)} valor(es) não legível(is) no total)`
                  : null}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OwnershipChainCard({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const chains = useMemo(() => deepestOwnershipChains(overlay, 3), [overlay]);
  const deepest = chains[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Cadeia societária mais profunda</CardTitle>
      </CardHeader>
      <CardContent>
        {deepest === undefined ? (
          <p className="py-8 text-center text-[12px] text-muted">
            Nenhuma cadeia de posse entre empresas.
          </p>
        ) : (
          <>
            <p className="font-bold text-2xl">{deepest.depth}</p>
            <p className="mb-2 text-[11px] text-muted">
              nível(is) acima de {extractLabel(deepest.company)}
            </p>
            <ul className="space-y-1">
              {chains.map((chain) => (
                <li
                  key={chain.company.id}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="truncate">{extractLabel(chain.company)}</span>
                  <span className="shrink-0 text-muted">{chain.depth} elo(s)</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const SECTOR_CONFIG = {
  count: { color: "var(--color-chart-4)", label: "Empresas" },
} satisfies ChartConfig;

function SectorBars({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const data = useMemo(() => sectorBreakdown(overlay), [overlay]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Distribuição por setor (CNAE)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">
            Nenhuma empresa com CNAE identificado.
          </p>
        ) : (
          <ChartContainer config={SECTOR_CONFIG} className="max-h-64 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey={(entry: (typeof data)[number]) => entry.cnae.id}
                tickFormatter={(value: string) => {
                  const entry = data.find((d) => d.cnae.id === value);
                  const label = entry === undefined ? value : extractLabel(entry.cnae);
                  return label.length > 18 ? `${label.slice(0, 18)}…` : label;
                }}
                width={140}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
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
          <CentralityBars overlay={overlay} />
          <PossibleMatchesCard overlay={overlay} />
          <OwnershipChainCard overlay={overlay} />
          <SectorBars overlay={overlay} />
        </div>
      </div>
      <div className="min-h-0 flex-1 border-border border-t">
        <FindingsPanel />
      </div>
    </div>
  );
}
