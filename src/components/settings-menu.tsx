"use client";

import { KeyRound, LogOut, TriangleAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { useAuthStore } from "@/store/auth";

export function SettingsMenu() {
  const role = useAuthStore((s) => s.role);
  const clearToken = useAuthStore((s) => s.clearToken);
  const router = useRouter();
  const { data: credentials } = useCredentialStatus();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasMissingCredential = credentials?.some((status) => !status.configured) ?? false;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handlePointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleLogout(): void {
    setIsOpen(false);
    clearToken();
    router.replace("/login");
  }

  function handleApiKeys(): void {
    setIsOpen(false);
    router.push("/settings");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        aria-label="Conta e configurações"
        aria-expanded={isOpen}
        title={
          hasMissingCredential
            ? "Nenhuma credencial configurada para o Portal da Transparência"
            : undefined
        }
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-white/10"
      >
        <UserRound size={16} />
        {hasMissingCredential ? (
          <TriangleAlert
            size={12}
            className="absolute -bottom-1 -right-1 rounded-full bg-background text-amber-500"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded border border-border bg-surface shadow-lg">
          {role === "ADMIN" ? (
            <button
              type="button"
              onClick={handleApiKeys}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
            >
              <KeyRound size={14} />
              Chaves de API
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
