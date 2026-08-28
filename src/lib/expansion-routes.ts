import type { CredentialStatus } from "@/types/api";

export type ExpansionRouteKey =
  "ceaf" | "ceis" | "cepim" | "cnep" | "legal_process" | "pep" | "root";

export type RouteProvider = "BRASIL_API" | "KIPFLOW" | "PORTAL_TRANSPARENCIA";

export interface ExpansionRoute {
  key: ExpansionRouteKey;
  label: string;
  priceBRL: number;
  provider: RouteProvider;
  supportsForce: boolean;
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
    priceBRL: 0.19,
    provider: "KIPFLOW",
    supportsForce: true,
  },
  {
    key: "cnep",
    label: "CNEP",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
    supportsForce: false,
  },
  {
    key: "ceis",
    label: "CEIS",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
    supportsForce: false,
  },
  {
    key: "ceaf",
    label: "CEAF",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
    supportsForce: false,
  },
  {
    key: "pep",
    label: "PEP",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
    supportsForce: false,
  },
  {
    key: "legal_process",
    label: "Processo jurídico",
    priceBRL: 3.5,
    provider: "KIPFLOW",
    supportsForce: false,
  },
];

const CNPJ_ROUTES: ExpansionRoute[] = [
  {
    key: "root",
    label: "Empresa (dados básicos)",
    priceBRL: 0,
    provider: "BRASIL_API",
    supportsForce: false,
  },
  {
    key: "cnep",
    label: "CNEP",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
    supportsForce: false,
  },
  {
    key: "ceis",
    label: "CEIS",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
    supportsForce: false,
  },
  {
    key: "cepim",
    label: "CEPIM",
    priceBRL: 0,
    provider: "PORTAL_TRANSPARENCIA",
    supportsForce: false,
  },
  {
    key: "legal_process",
    label: "Processo jurídico",
    priceBRL: 5,
    provider: "KIPFLOW",
    supportsForce: false,
  },
];

export function expansionRoutesFor(documentIsCpf: boolean): ExpansionRoute[] {
  return documentIsCpf ? CPF_ROUTES : CNPJ_ROUTES;
}

export function formatPriceBRL(priceBRL: number): string {
  return priceBRL === 0 ? "Grátis" : `R$${priceBRL.toFixed(2).replace(".", ",")}`;
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
