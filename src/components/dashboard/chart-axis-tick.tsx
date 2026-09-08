const MAX_CHARS = 18;

export function truncateAxisLabel(value: string): string {
  return value.length > MAX_CHARS ? `${value.slice(0, MAX_CHARS)}…` : value;
}

export interface ChartAxisTickProps {
  payload?: { value: string };
  x?: number | string;
  y?: number | string;
}

export function ChartAxisTick({
  payload = { value: "" },
  x = 0,
  y = 0,
}: ChartAxisTickProps) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" className="fill-muted-foreground text-xs">
      <title>{payload.value}</title>
      {truncateAxisLabel(payload.value)}
    </text>
  );
}
