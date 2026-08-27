"use client";

import type { ReactNode } from "react";
import { BatchBar } from "@/components/data-table/batch-bar";
import { DetailPanel } from "@/components/detail-panel/detail-panel";
import { GraphInfoButton } from "@/components/graph-info-button";
import { SettingsMenu } from "@/components/settings-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewSwitch } from "@/components/view-switch";
import { WhiteboardSearchBar } from "@/components/whiteboard-search-bar";
import { useOverlay } from "@/hooks/use-overlay";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const overlay = useOverlay();

  return (
    <div className="flex h-full flex-col print:h-auto">
      <header className="flex items-center gap-2 border-b border-border bg-surface p-2 print:hidden">
        <div className="flex shrink-0 items-center gap-2">
          <GraphInfoButton />
          <ViewSwitch />
        </div>
        <div className="flex flex-1 justify-center">
          <WhiteboardSearchBar />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <SettingsMenu />
        </div>
      </header>

      <BatchBar nodes={overlay.nodes} />

      <div className="relative flex flex-1 overflow-hidden print:block print:h-auto print:overflow-visible">
        <div className="relative min-w-0 flex-1 print:w-full">{children}</div>
        <DetailPanel />
      </div>
    </div>
  );
}
