import { severityLabel, type FindingSeverity } from "@/lib/findings";
import { cn } from "@/lib/utils";

const SEVERITY_BADGE_STYLES: Record<FindingSeverity, string> = {
  alto: "border-destructive/40 bg-destructive/10 text-destructive",
  baixo: "border-border bg-surface-2 text-muted",
  medio: "border-warning/40 bg-warning/15 text-warning",
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        SEVERITY_BADGE_STYLES[severity],
      )}
    >
      {severityLabel(severity)}
    </span>
  );
}
