"use client";

import { KeyRound, LogOut, TriangleAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flyout } from "@/components/flyout";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { useAuthStore } from "@/store/auth";

export function SettingsMenu() {
  const role = useAuthStore((s) => s.role);
  const clearToken = useAuthStore((s) => s.clearToken);
  const router = useRouter();
  const { data: credentials } = useCredentialStatus();
  const [open, setOpen] = useState(false);

  const hasMissingCredential =
    credentials?.some((status) => !status.configured) ?? false;

  function handleLogout(): void {
    setOpen(false);
    clearToken();
    router.replace("/login");
  }

  function handleApiKeys(): void {
    setOpen(false);
    router.push("/settings");
  }

  return (
    <Flyout
      open={open}
      onOpenChange={setOpen}
      title="Conta e configurações"
      align="end"
      trigger={
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Conta e configurações"
          title={
            hasMissingCredential
              ? "Uma credencial necessária não está configurada"
              : undefined
          }
          className="relative size-8 rounded-md"
        >
          <UserRound size={16} />
          {hasMissingCredential ? (
            <TriangleAlert
              size={12}
              className="absolute -right-1 -bottom-1 rounded-full bg-background text-amber-500"
            />
          ) : null}
        </Button>
      }
    >
      <ul className="p-1.5">
        {role === "ADMIN" ? (
          <li>
            <button
              type="button"
              onClick={handleApiKeys}
              className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-[12px] hover:bg-surface-2"
            >
              <KeyRound size={14} className="text-muted" />
              Chaves de API
            </button>
          </li>
        ) : null}
        <li>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-[12px] text-destructive hover:bg-destructive/10"
          >
            <LogOut size={14} />
            Sair
          </button>
        </li>
      </ul>
    </Flyout>
  );
}
