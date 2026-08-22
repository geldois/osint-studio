"use client";

import { ChevronLeft, X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsDesktop } from "@/hooks/use-is-desktop";

export interface FlyoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  title: string;
  onBack?: () => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
}

export function Flyout({
  open,
  onOpenChange,
  trigger,
  title,
  onBack,
  children,
  align = "center",
}: FlyoutProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger render={trigger} />
        <PopoverContent align={align} className="w-80 gap-0 p-0">
          {children}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[80dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
      >
        <div className="flex shrink-0 items-center gap-1.5 border-border border-b bg-surface p-2">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              aria-label="Voltar"
            >
              <ChevronLeft size={16} />
            </Button>
          ) : null}
          <span className="flex-1 truncate font-medium text-sm">{title}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              onOpenChange(false);
            }}
            aria-label="Fechar"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
