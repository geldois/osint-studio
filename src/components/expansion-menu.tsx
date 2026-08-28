"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { isCpf } from "@/lib/document";
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
  onConfirm: (routes: ExpansionRouteKey[], force: boolean) => void;
}

export function ExpansionMenu({
  document,
  isPending,
  onClose,
  onConfirm,
}: ExpansionMenuProps) {
  const documentIsCpf = isCpf(document);
  const routes = expansionRoutesFor(documentIsCpf);
  const { data: credentialStatuses } = useCredentialStatus();

  const [selected, setSelected] = useState<Set<ExpansionRouteKey>>(new Set());
  const [force, setForce] = useState(false);

  const total = totalPriceBRL(routes, selected);
  const showForce = routes.some(
    (route) => route.supportsForce && selected.has(route.key),
  );

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
  }

  return (
    <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-border bg-surface-2 shadow-lg">
      <div className="flex items-center justify-between border-border border-b p-2">
        <span className="font-medium text-[12px]">Rotas de expansão</span>
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
          return (
            <label
              key={route.key}
              className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-[12px] hover:bg-white/5"
            >
              <Checkbox
                checked={selected.has(route.key)}
                onCheckedChange={(checked) => {
                  toggle(route.key, checked);
                }}
              />
              <span className="min-w-0 flex-1 truncate">{route.label}</span>
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
          );
        })}
      </div>

      {showForce ? (
        <label className="flex items-center gap-2 border-border border-t p-2 text-[11px] text-muted">
          <Checkbox checked={force} onCheckedChange={setForce} />
          Forçar nova busca — só reaplica a {documentIsCpf ? "Pessoa" : "Empresa"}; as
          demais rotas marcadas sempre reconsultam a fonte, com custo se forem pagas.
        </label>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-border border-t p-2">
        <span className="text-[11px] text-muted">
          {selected.size} selecionada{selected.size === 1 ? "" : "s"}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={selected.size === 0 || isPending}
          onClick={() => {
            onConfirm([...selected], force);
          }}
        >
          {isPending ? "Buscando..." : `Buscar · ${formatPriceBRL(total)}`}
        </Button>
      </div>
    </div>
  );
}
