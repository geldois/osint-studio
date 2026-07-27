"use client";

import { ArrowLeft, Settings, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { useAuthStore } from "@/store/auth";

export function SettingsButton() {
  const role = useAuthStore((s) => s.role);
  const pathname = usePathname();
  const { data: credentials } = useCredentialStatus();

  if (role !== "ADMIN") {
    return null;
  }

  const isOnSettings = pathname === "/settings";
  const Icon = isOnSettings ? ArrowLeft : Settings;
  const hasMissingCredential = credentials?.some((status) => !status.configured) ?? false;
  const showWarning = hasMissingCredential && !isOnSettings;

  return (
    <Link
      href={isOnSettings ? "/whiteboard" : "/settings"}
      aria-label={isOnSettings ? "Voltar" : "Configurações"}
      title={
        showWarning
          ? "Nenhuma credencial configurada para o Portal da Transparência"
          : undefined
      }
      className={`fixed top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded border bg-surface text-foreground hover:bg-white/10 ${
        showWarning ? "border-amber-500" : "border-border"
      }`}
    >
      {showWarning ? <TriangleAlert size={16} className="text-amber-500" /> : <Icon size={16} />}
    </Link>
  );
}
