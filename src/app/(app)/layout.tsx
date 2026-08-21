"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { useHydrateGraphSelection } from "@/hooks/use-hydrate-graph-selection";

export default function AppLayout({ children }: { children: ReactNode }) {
  useHydrateGraphSelection();
  return <AuthGuard>{children}</AuthGuard>;
}
