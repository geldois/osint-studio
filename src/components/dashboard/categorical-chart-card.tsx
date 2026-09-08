"use client";

/* eslint-disable @typescript-eslint/no-deprecated */

import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
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
import { ChartAxisTick } from "@/components/dashboard/chart-axis-tick";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface CategoricalDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface CategoricalChartCardProps {
  title: string;
  data: CategoricalDatum[];
  emptyMessage: string;
  defaultVariant?: "bar" | "pie";
  onSelect?: (datum: CategoricalDatum) => void;
  action?: ReactNode;
  footer?: ReactNode;
}

export function categoricalChartConfig(data: CategoricalDatum[]): ChartConfig {
  return Object.fromEntries(
    data.map((datum) => [datum.key, { color: datum.color, label: datum.label }]),
  );
}

export function CategoricalChartCard({
  title,
  data,
  emptyMessage,
  defaultVariant = "bar",
  onSelect,
  action,
  footer,
}: CategoricalChartCardProps) {
  const [variant, setVariant] = useState<"bar" | "pie">(defaultVariant);
  const config = categoricalChartConfig(data);

  const variantToggle =
    data.length > 1 ? (
      <ToggleGroup
        value={[variant]}
        onValueChange={(value: string[]) => {
          const next = value[0];
          if (next === "bar" || next === "pie") {
            setVariant(next);
          }
        }}
        className="flex h-6 overflow-hidden rounded-md border border-border"
        orientation="horizontal"
        spacing={0}
      >
        <ToggleGroupItem
          value="bar"
          size="sm"
          className="size-6 border-border border-r p-0"
          aria-label="Ver como barras"
        >
          <BarChart3 size={12} />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="pie"
          size="sm"
          className="size-6 p-0"
          aria-label="Ver como pizza"
        >
          <PieChartIcon size={12} />
        </ToggleGroupItem>
      </ToggleGroup>
    ) : null;

  const combinedAction =
    variantToggle !== null || action !== undefined ? (
      <div className="flex items-center gap-1.5">
        {variantToggle}
        {action}
      </div>
    ) : undefined;

  return (
    <DashboardChartCard
      title={title}
      isEmpty={data.length === 0}
      emptyMessage={emptyMessage}
      action={combinedAction}
      footer={footer}
    >
      <ChartContainer config={config} className="aspect-auto size-full">
        {variant === "bar" ? (
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
            <Bar dataKey="value" radius={4}>
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={`var(--color-${entry.key})`}
                  className={onSelect ? "cursor-pointer" : undefined}
                  onClick={() => {
                    onSelect?.(entry);
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius={48}
              strokeWidth={4}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={`var(--color-${entry.key})`}
                  className={onSelect ? "cursor-pointer" : undefined}
                  onClick={() => {
                    onSelect?.(entry);
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        )}
      </ChartContainer>
    </DashboardChartCard>
  );
}
