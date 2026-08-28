"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Flyout } from "@/components/flyout";

function subscribeNever(): () => void {
  return () => undefined;
}

function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

const OPTIONS = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 rounded-md"
        disabled
        aria-label="Tema"
      >
        <span className="size-4" />
      </Button>
    );
  }

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[0];
  const ActiveIcon = active.icon;

  return (
    <Flyout
      open={open}
      onOpenChange={setOpen}
      title="Tema"
      align="end"
      trigger={
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 rounded-md aria-expanded:bg-primary/15 aria-expanded:text-primary"
          aria-label="Tema"
          title={`Tema: ${active.label}`}
        >
          <ActiveIcon size={16} />
        </Button>
      }
    >
      <ul className="p-1.5">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = option.value === theme;
          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-[12px] hover:bg-surface-2"
              >
                <Icon size={14} className="text-muted" />
                <span className="flex-1">{option.label}</span>
                {isActive ? <Check size={14} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Flyout>
  );
}
