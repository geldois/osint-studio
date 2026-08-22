import { AlertCircle, TriangleAlert } from "lucide-react";

export interface FieldWarningProps {
  tone: "error" | "warning";
  message: string;
  inField?: boolean;
}

export function FieldWarning({ tone, message, inField = true }: FieldWarningProps) {
  const Icon = tone === "error" ? AlertCircle : TriangleAlert;
  const toneClassName = tone === "error" ? "text-destructive" : "text-amber-500";
  return (
    <span
      className={
        inField
          ? `pointer-events-auto absolute top-1/2 right-2 -translate-y-1/2 ${toneClassName}`
          : toneClassName
      }
      title={message}
    >
      <Icon size={14} />
    </span>
  );
}
