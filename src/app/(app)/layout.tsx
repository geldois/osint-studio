import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { SettingsButton } from "@/components/settings-button";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SettingsButton />
      {children}
    </AuthGuard>
  );
}
