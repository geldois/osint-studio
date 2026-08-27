"use client";

/* eslint-disable @typescript-eslint/no-deprecated */

import { Printer } from "lucide-react";
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
import { useOverlay } from "@/hooks/use-overlay";
import { extractLabel } from "@/lib/graph-adapter";
import {
  categoryLabel,
  countBySeverity,
  evaluateFindings,
  type FindingCategory,
  type FindingSeverity,
} from "@/lib/findings";
import { topConnectedEntities } from "@/lib/graph-stats";

const GENERATED_AT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

const SEVERITY_ORDER: FindingSeverity[] = ["alto", "medio", "baixo"];

const SEVERITY_CONFIG: ChartConfig = {
  alto: { color: "var(--color-destructive)", label: "Alto" },
  baixo: { color: "var(--color-muted)", label: "Baixo" },
  medio: { color: "var(--color-warning)", label: "Médio" },
};

const CATEGORY_ORDER: FindingCategory[] = [
  "fraude",
  "conflito_interesse",
  "risco_associacao",
  "identidade",
  "qualidade_dado",
];

const CATEGORY_CHART_COLORS: Record<FindingCategory, string> = {
  conflito_interesse: "var(--color-chart-3)",
  fraude: "var(--color-chart-5)",
  identidade: "var(--color-chart-2)",
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

function DashboardHeader({ overlay }: { overlay: ReturnType<typeof useOverlay> }) {
  const nodeById = new Map(overlay.nodes.map((node) => [node.id, node]));
  const roots = [...overlay.roots]
    .map((id) => nodeById.get(id))
    .filter((node): node is NonNullable<typeof node> => node !== undefined)
    .filter((node) => node.type !== "text_source");

  return (
    <div className="flex items-start justify-between gap-3 border-border border-b p-3">
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
  );
}

export function FindingsDashboard() {
  const overlay = useOverlay();
  const findings = useMemo(() => evaluateFindings(overlay), [overlay]);
  const counts = countBySeverity(findings);

  return (
    <div className="flex h-full flex-col overflow-y-auto print:h-auto print:overflow-visible">
      <DashboardHeader overlay={overlay} />
      <div className="grid gap-3 p-3 md:grid-cols-3">
        <SeverityDonut counts={counts} />
        <CategoryBars findings={findings} />
        <CentralityBars overlay={overlay} />
      </div>
      <div className="min-h-0 flex-1 border-border border-t">
        <FindingsPanel />
      </div>
    </div>
  );
}
