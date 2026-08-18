"use client";

import { KeyRound, LogOut, TriangleAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { useAuthStore } from "@/store/auth";

export function SettingsMenu() {
  const role = useAuthStore((s) => s.role);
  const clearToken = useAuthStore((s) => s.clearToken);
  const router = useRouter();
  const { data: credentials } = useCredentialStatus();

  const hasMissingCredential =
    credentials?.some((status) => !status.configured) ?? false;

  function handleLogout(): void {
    clearToken();
    router.replace("/login");
  }

  function handleApiKeys(): void {
    router.push("/settings");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Conta e configurações"
        title={
          hasMissingCredential
            ? "Uma credencial necessária não está configurada"
            : undefined
        }
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-accent"
      >
        <UserRound size={16} />
        {hasMissingCredential ? (
          <TriangleAlert
            size={12}
            className="absolute -right-1 -bottom-1 rounded-full bg-background text-amber-500"
          />
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {role === "ADMIN" ? (
          <DropdownMenuItem onClick={handleApiKeys}>
            <KeyRound size={14} />
            Chaves de API
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut size={14} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
