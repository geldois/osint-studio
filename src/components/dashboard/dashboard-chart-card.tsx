import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardChartCardProps {
  action?: ReactNode;
  children: ReactNode;
  emptyMessage: string;
  footer?: ReactNode;
  isEmpty: boolean;
  scrollable?: boolean;
  title: string;
}

export function DashboardChartCard({
  action,
  children,
  emptyMessage,
  footer,
  isEmpty,
  scrollable = false,
  title,
}: DashboardChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        <div className={cn("h-56", scrollable ? "overflow-y-auto" : "overflow-hidden")}>
          {isEmpty ? (
            <p className="flex h-full items-center justify-center text-center text-[12px] text-muted">
              {emptyMessage}
            </p>
          ) : (
            children
          )}
        </div>
      </CardContent>
      {!isEmpty && footer ? (
        <CardFooter className="mt-0 px-0">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}
