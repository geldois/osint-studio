"use client";

import { CornerDownLeft, Loader2, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldWarning } from "@/components/field-warning";
import { IngestFlyout } from "@/components/ingest/ingest-flyout";
import { Input } from "@/components/ui/input";
import { useExpand } from "@/hooks/use-expand";
import { RateLimitError } from "@/lib/api";
import {
  isAlreadyFetchedError,
  translateError,
  visibleErrorMessages,
} from "@/lib/errors";
import { useAuthStore } from "@/store/auth";

export function WhiteboardSearchBar() {
  const role = useAuthStore((s) => s.role);
  const [query, setQuery] = useState("");
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
  const canForceRetry = error !== null && isAlreadyFetchedError(error);
  const warningMessage = isBlocked
    ? `Limite atingido. Tente novamente em ${String(retryAfterSeconds)}s.`
    : error
      ? translateError(error)
      : visibleErrors.length > 0
        ? visibleErrors.join(" ")
        : null;
  const warningTone: "error" | "warning" =
    isBlocked || visibleErrors.length > 0 ? "warning" : "error";

  function submit(force = false): void {
    if (isPending || isBlocked || query.trim() === "") {
      return;
    }
    mutate(
      { document: query.trim(), force },
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
    <div className="flex w-full max-w-md items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
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
        onClick={() => {
          submit(canForceRetry);
        }}
        aria-label={canForceRetry ? "Buscar novamente" : "Expandir"}
        title={
          isPending
            ? "Expandindo..."
            : canForceRetry
              ? "Este documento já foi consultado antes. Buscar novamente consome um novo crédito."
              : "Expandir"
        }
        className={canForceRetry ? "size-8 shrink-0 text-amber-500" : "size-8 shrink-0"}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : canForceRetry ? (
          <RotateCcw size={14} />
        ) : (
          <CornerDownLeft size={14} />
        )}
      </Button>
    </div>
  );
}
