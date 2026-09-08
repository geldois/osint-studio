"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AlreadyFetchedNotice } from "@/components/already-fetched-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { useFetchedRoutes } from "@/hooks/use-fetched-routes";
import { documentKind, documentKindLabel } from "@/lib/document";
import {
  credentialConfiguredFor,
  type ExpansionRouteKey,
  expansionRoutesFor,
  formatPriceBRL,
  providerLabel,
  totalPriceBRL,
} from "@/lib/expansion-routes";
import { cn } from "@/lib/utils";

interface ExpansionMenuProps {
  document: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (routes: ExpansionRouteKey[], forced: Set<ExpansionRouteKey>) => void;
}

export function ExpansionMenu({
  document,
  isPending,
  onClose,
  onConfirm,
}: ExpansionMenuProps) {
  const kind = documentKind(document);
  const documentIsCpf = kind === "cpf";
  const routes = expansionRoutesFor(documentIsCpf);
  const { data: credentialStatuses } = useCredentialStatus();
  const { data: fetchedRoutes } = useFetchedRoutes(document);

  const [selected, setSelected] = useState<Set<ExpansionRouteKey>>(new Set());
  const [forced, setForced] = useState<Set<ExpansionRouteKey>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (
        containerRef.current !== null &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    globalThis.document.addEventListener("pointerdown", handlePointerDown);
    globalThis.document.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
      globalThis.document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const total = totalPriceBRL(routes, selected);

  function toggle(key: ExpansionRouteKey, checked: boolean): void {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    if (!checked) {
      setForced((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function toggleForced(key: ExpansionRouteKey, force: boolean): void {
    setForced((current) => {
      const next = new Set(current);
      if (force) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  const hasUnconfirmedReuse = [...selected].some(
    (key) => (fetchedRoutes?.has(key) ?? false) && !forced.has(key),
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-border bg-surface-2 shadow-lg"
    >
      <div className="flex items-center justify-between border-border border-b p-2">
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-[12px]">Rotas de expansão</span>
          {kind !== null ? (
            <span className="rounded-sm bg-primary/15 px-1 text-[9px] text-primary uppercase">
              {documentKindLabel(kind)}
            </span>
          ) : null}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={14} />
        </Button>
      </div>

      <div className="max-h-72 space-y-0.5 overflow-auto p-1.5">
        {routes.map((route) => {
          const configured = credentialConfiguredFor(
            route.provider,
            credentialStatuses ?? [],
          );
          const alreadyFetched = fetchedRoutes?.has(route.key) ?? false;
          return (
            <div key={route.key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-[12px] hover:bg-foreground/5">
                <Checkbox
                  checked={selected.has(route.key)}
                  onCheckedChange={(checked) => {
                    toggle(route.key, checked);
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-left">{route.label}</span>
                {alreadyFetched ? (
                  <Badge variant="secondary" className="shrink-0">
                    já buscado
                  </Badge>
                ) : null}
                <span className="shrink-0 text-[10px] text-muted">
                  {providerLabel(route.provider)}
                  {configured === false ? " · sem credencial" : ""}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                    route.priceBRL === 0
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-amber-500/15 text-amber-500",
                  )}
                >
                  {formatPriceBRL(route.priceBRL)}
                </span>
              </label>
              {selected.has(route.key) ? (
                <div className="px-1.5 pb-1.5">
                  <AlreadyFetchedNotice
                    alreadyFetched={alreadyFetched}
                    force={forced.has(route.key)}
                    onForceChange={(force) => {
                      toggleForced(route.key, force);
                    }}
                    label={`Reconsultar ${route.label} mesmo assim${route.priceBRL > 0 ? ", cobrando novamente" : ""}.`}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-border border-t p-2">
        <span className="text-[11px] text-muted">
          {selected.size} selecionada{selected.size === 1 ? "" : "s"}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={selected.size === 0 || isPending || hasUnconfirmedReuse}
          onClick={() => {
            onConfirm([...selected], forced);
          }}
        >
          {isPending ? "Buscando..." : `Buscar · ${formatPriceBRL(total)}`}
        </Button>
      </div>
    </div>
  );
}
