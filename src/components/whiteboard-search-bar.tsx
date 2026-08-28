"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExpansionMenu } from "@/components/expansion-menu";
import { FieldWarning } from "@/components/field-warning";
import { IngestFlyout } from "@/components/ingest/ingest-flyout";
import { Input } from "@/components/ui/input";
import { useExpand } from "@/hooks/use-expand";
import { useGraphCatalog } from "@/hooks/use-graph-catalog";
import { RateLimitError } from "@/lib/api";
import { documentKind } from "@/lib/document";
import { translateError, visibleErrorMessages } from "@/lib/errors";
import { documentExistsInCatalog } from "@/lib/graph-adapter";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

export function WhiteboardSearchBar() {
  const role = useAuthStore((s) => s.role);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuGeneration, setMenuGeneration] = useState(0);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const { mutate, isPending, error, data } = useExpand();
  const { data: catalog } = useGraphCatalog();
  const searchPlaceholder = role === "VIEWER" ? "CNPJ" : "CPF ou CNPJ";
  const recognizedKind = documentKind(query);
  const trimmedQuery = query.trim();
  const existsInGraph = documentExistsInCatalog(trimmedQuery, catalog?.entries ?? []);

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
    if (isPending || isBlocked || recognizedKind === null) {
      return;
    }
    if (role === "ADMIN") {
      setMenuOpen(true);
      return;
    }
    mutate(
      { document: trimmedQuery, routes: ["root"] },
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
    <div className="relative flex w-full max-w-md items-center gap-1 rounded-md border border-border bg-surface-2 p-1">
      {role === "ADMIN" ? <IngestFlyout /> : null}
      <div className="relative min-w-0 flex-1">
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
          className="border-0 bg-transparent pr-7 pl-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {warningMessage !== null ? (
          <FieldWarning tone={warningTone} message={warningMessage} />
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isPending || isBlocked || recognizedKind === null}
        onClick={submit}
        aria-label="Expandir"
        title={isPending ? "Expandindo..." : "Expandir"}
        className={cn(
          "size-8 shrink-0 rounded-md",
          recognizedKind !== null &&
            "bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary",
        )}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Search size={14} />
        )}
      </Button>
      {menuOpen ? (
        <ExpansionMenu
          key={`${trimmedQuery}-${String(menuGeneration)}`}
          document={trimmedQuery}
          isPending={isPending}
          existsInGraph={existsInGraph}
          onClose={() => {
            setMenuOpen(false);
          }}
          onConfirm={(routes, force) => {
            mutate(
              { document: trimmedQuery, routes, force },
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
