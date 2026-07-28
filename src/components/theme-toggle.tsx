"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/theme";

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className="flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-foreground hover:bg-white/10 dark:hover:bg-white/10"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
