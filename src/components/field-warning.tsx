import { AlertCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldWarningProps {
  tone: "error" | "warning";
  message: string;
  inField?: boolean;
  className?: string;
}

export function FieldWarning({
  tone,
  message,
  inField = true,
  className,
}: FieldWarningProps) {
  const Icon = tone === "error" ? AlertCircle : TriangleAlert;
  const toneClassName = tone === "error" ? "text-destructive" : "text-amber-500";
  return (
    <span
      className={
        inField
          ? cn(
              "pointer-events-auto absolute top-1/2 right-2 -translate-y-1/2",
              toneClassName,
              className,
            )
          : cn(toneClassName, className)
      }
      title={message}
    >
      <Icon size={14} />
    </span>
  );
}
