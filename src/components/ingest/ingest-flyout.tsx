"use client";

import { Paperclip } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flyout } from "@/components/flyout";
import { IngestForm } from "@/components/ingest/ingest-form";
import { useAuthStore } from "@/store/auth";

export function IngestFlyout() {
  const role = useAuthStore((s) => s.role);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        clearTimeout(closeTimer.current);
      }
    };
  }, []);

  function handleOpenChange(next: boolean): void {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(next);
  }

  if (role !== "ADMIN") {
    return null;
  }

  return (
    <Flyout
      open={open}
      onOpenChange={handleOpenChange}
      title="Ingestão de arquivo"
      align="start"
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Ingestão de arquivo"
          title="Ingestão de arquivo"
          className="size-8 shrink-0 rounded-md bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary aria-expanded:bg-primary/25 aria-expanded:text-primary"
        >
          <Paperclip size={15} />
        </Button>
      }
    >
      <div className="p-2.5">
        <IngestForm
          compact
          onSuccess={() => {
            closeTimer.current = setTimeout(() => {
              closeTimer.current = null;
              setOpen(false);
            }, 1500);
          }}
        />
      </div>
    </Flyout>
  );
}
