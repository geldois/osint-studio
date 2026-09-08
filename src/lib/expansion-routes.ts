import {
  formatCostBRL,
  KIPFLOW_CPF_COST_BRL,
  KIPFLOW_LEGAL_PROCESS_CNPJ_COST_BRL,
  KIPFLOW_LEGAL_PROCESS_CPF_COST_BRL,
} from "@/lib/pricing";
import type { CredentialStatus } from "@/types/api";

export type ExpansionRouteKey =
  "ceaf" | "ceis" | "cepim" | "cnep" | "legal_process" | "pep" | "root";

export type RouteProvider = "BRASIL_API" | "KIPFLOW" | "PORTAL_TRANSPARENCIA";

export interface ExpansionRoute {
  key: ExpansionRouteKey;
  label: string;
  priceBRL: number;
  provider: RouteProvider;
}

const PROVIDER_LABELS: Record<RouteProvider, string> = {
  BRASIL_API: "BrasilAPI",
  KIPFLOW: "Kipflow",
  PORTAL_TRANSPARENCIA: "Portal da Transparência",
};

export function providerLabel(provider: RouteProvider): string {
  return PROVIDER_LABELS[provider];
}

const CPF_ROUTES: ExpansionRoute[] = [
  {
    key: "root",
    label: "Pessoa (dados básicos)",
    priceBRL: KIPFLOW_CPF_COST_BRL,
    provider: "KIPFLOW",
  },
  {
    key: "cnep",
    label: "CNEP",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
  },
  {
    key: "ceis",
    label: "CEIS",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
  },
  {
    key: "ceaf",
    label: "CEAF",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
  },
  {
    key: "pep",
    label: "PEP",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
  },
  {
    key: "legal_process",
    label: "Processo jurídico",
    priceBRL: KIPFLOW_LEGAL_PROCESS_CPF_COST_BRL,
    provider: "KIPFLOW",
  },
];

const CNPJ_ROUTES: ExpansionRoute[] = [
  {
    key: "root",
    label: "Empresa (dados básicos)",
    priceBRL: 0,
    provider: "BRASIL_API",
  },
  {
    key: "cnep",
    label: "CNEP",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
  },
  {
    key: "ceis",
    label: "CEIS",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
  },
  {
    key: "cepim",
    label: "CEPIM",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
  },
  {
    key: "legal_process",
    label: "Processo jurídico",
    priceBRL: KIPFLOW_LEGAL_PROCESS_CNPJ_COST_BRL,
    provider: "KIPFLOW",
  },
];

export function expansionRoutesFor(documentIsCpf: boolean): ExpansionRoute[] {
  return documentIsCpf ? CPF_ROUTES : CNPJ_ROUTES;
}

const BACKEND_PROVIDER_TO_ROUTE_KEY: Record<string, ExpansionRouteKey> = {
  brasilapi: "root",
  ceaf: "ceaf",
  ceis: "ceis",
  cepim: "cepim",
  cnep: "cnep",
  kipflow: "root",
  legal_process: "legal_process",
  pep: "pep",
};

export function fetchedRouteKeys(fetchedRoutes: string[]): Set<ExpansionRouteKey> {
  const keys = new Set<ExpansionRouteKey>();
  for (const provider of fetchedRoutes) {
    const key = BACKEND_PROVIDER_TO_ROUTE_KEY[provider];
    if (key !== undefined) {
      keys.add(key);
    }
  }
  return keys;
}

export function formatPriceBRL(priceBRL: number): string {
  return priceBRL === 0 ? "Grátis" : formatCostBRL(priceBRL);
}

export function totalPriceBRL(
  routes: ExpansionRoute[],
  selected: ReadonlySet<ExpansionRouteKey>,
): number {
  return routes
    .filter((route) => selected.has(route.key))
    .reduce((sum, route) => sum + route.priceBRL, 0);
}

export function credentialConfiguredFor(
  provider: RouteProvider,
  statuses: CredentialStatus[],
): boolean | null {
  if (provider === "BRASIL_API") {
    return null;
  }
  return statuses.find((status) => status.provider === provider)?.configured ?? false;
}
