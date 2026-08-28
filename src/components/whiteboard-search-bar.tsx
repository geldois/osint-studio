"use client";

import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExpansionMenu } from "@/components/expansion-menu";
import { FieldWarning } from "@/components/field-warning";
import { IngestFlyout } from "@/components/ingest/ingest-flyout";
import { Input } from "@/components/ui/input";
import { useExpand } from "@/hooks/use-expand";
import { RateLimitError } from "@/lib/api";
import { translateError, visibleErrorMessages } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";

export function WhiteboardSearchBar() {
  const role = useAuthStore((s) => s.role);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuGeneration, setMenuGeneration] = useState(0);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const { mutate, isPending, error, data } = useExpand();
  const searchPlaceholder = role === "VIEWER" ? "CNPJ" : "CPF ou CNPJ";

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [retryAfterSeconds]);

  const isBlocked = retryAfterSeconds > 0;
  const visibleErrors = data ? visibleErrorMessages(data.errors) : [];
  const warningMessage = isBlocked
    ? `Limite atingido. Tente novamente em ${String(retryAfterSeconds)}s.`
    : error
      ? translateError(error)
      : visibleErrors.length > 0
        ? visibleErrors.join(" ")
        : null;
  const warningTone: "error" | "warning" =
    isBlocked || visibleErrors.length > 0 ? "warning" : "error";

  function submit(): void {
    if (isPending || isBlocked || query.trim() === "") {
      return;
    }
    if (role === "ADMIN") {
      setMenuOpen(true);
      return;
    }
    mutate(
      { document: query.trim(), routes: ["root"] },
      {
        onError: (mutationError) => {
          if (mutationError instanceof RateLimitError) {
            setRetryAfterSeconds(Math.ceil(mutationError.retryAfterSeconds));
          }
        },
      },
    );
  }

  return (
    <div className="relative flex w-full max-w-md items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
      {role === "ADMIN" ? <IngestFlyout /> : null}
      <div className="relative min-w-0 flex-1">
        <Search
          size={13}
          className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted"
        />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMenuOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
          }}
          aria-invalid={warningMessage !== null && warningTone === "error"}
          placeholder={searchPlaceholder}
          className="border-0 bg-transparent px-7 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {warningMessage !== null ? (
          <FieldWarning tone={warningTone} message={warningMessage} />
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isPending || isBlocked || query.trim() === ""}
        onClick={submit}
        aria-label="Expandir"
        title={isPending ? "Expandindo..." : "Expandir"}
        className="size-8 shrink-0"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CornerDownLeft size={14} />
        )}
      </Button>
      {menuOpen ? (
        <ExpansionMenu
          key={`${query.trim()}-${String(menuGeneration)}`}
          document={query.trim()}
          isPending={isPending}
          onClose={() => {
            setMenuOpen(false);
          }}
          onConfirm={(routes, force) => {
            mutate(
              { document: query.trim(), routes, force },
              {
                onError: (mutationError) => {
                  if (mutationError instanceof RateLimitError) {
                    setRetryAfterSeconds(Math.ceil(mutationError.retryAfterSeconds));
                  }
                },
              },
            );
            setMenuGeneration((generation) => generation + 1);
          }}
        />
      ) : null}
    </div>
  );
}
