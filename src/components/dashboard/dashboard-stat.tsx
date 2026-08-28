import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardStatProps {
  label: string;
  tone?: "default" | "destructive" | "warning";
  value: string;
}

const TONE_CLASSES: Record<NonNullable<DashboardStatProps["tone"]>, string> = {
  default: "text-foreground",
  destructive: "text-destructive",
  warning: "text-warning",
};

export function DashboardStat({ label, tone = "default", value }: DashboardStatProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className={cn("font-bold text-2xl", TONE_CLASSES[tone])}>{value}</p>
        <p className="text-[11px] text-muted">{label}</p>
      </CardContent>
    </Card>
  );
}
