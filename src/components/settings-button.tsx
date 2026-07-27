"use client";

import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export function SettingsButton() {
  const role = useAuthStore((s) => s.role);
  const pathname = usePathname();

  if (role !== "ADMIN") {
    return null;
  }

  const isOnSettings = pathname === "/settings";
  const Icon = isOnSettings ? ArrowLeft : Settings;

  return (
    <Link
      href={isOnSettings ? "/whiteboard" : "/settings"}
      aria-label={isOnSettings ? "Voltar" : "Configurações"}
      className="fixed top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-foreground hover:bg-white/10"
    >
      <Icon size={16} />
    </Link>
  );
}
