import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DashboardChartCardProps {
  action?: ReactNode;
  children: ReactNode;
  emptyMessage: string;
  footer?: ReactNode;
  isEmpty: boolean;
  title: string;
}

export function DashboardChartCard({
  action,
  children,
  emptyMessage,
  footer,
  isEmpty,
  title,
}: DashboardChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        <div className="flex h-56 flex-col overflow-y-auto">
          {isEmpty ? (
            <p className="m-auto text-center text-[12px] text-muted">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
        {!isEmpty && footer ? footer : null}
      </CardContent>
    </Card>
  );
}
