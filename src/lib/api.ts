import { ApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import type {
  CredentialStatus,
  GraphSchema,
  Provider,
  TextPatternSet,
  TokenResponse,
} from "@/types/api";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Limite atingido.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada. Faça login novamente.");
    this.name = "SessionExpiredError";
  }
}

function parseRetryAfterSeconds(res: Response): number {
  const header = res.headers.get("Retry-After");
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) ? seconds : 60;
}

async function parseApiError(res: Response): Promise<ApiError> {
  const { detail, type } = (await res.json()) as {
    detail: string | { msg: string }[];
    type: string | null;
  };
  const message = Array.isArray(detail)
    ? detail.map((error) => error.msg).join(" ")
    : detail;
  return new ApiError(message, type);
}

/** For unauthenticated endpoints (login, viewer-token): a 401 here means
 * rejected credentials, not an expired session — it must not clear the
 * token or redirect. */
async function throwForPublicEndpointError(res: Response): Promise<never> {
  if (res.status === 429) {
    throw new RateLimitError(parseRetryAfterSeconds(res));
  }
  throw await parseApiError(res);
}

/** A rejected external-provider API key (Portal da Transparência) also maps
 * to 401, but it's the session's own JWT that's still valid — only the
 * stored external credential is bad. Must not clear the session token. */
const _EXTERNAL_CREDENTIAL_ERROR_CODES = new Set(["EXTERNAL_CREDENTIAL_REJECTED"]);

/** For endpoints that require an existing session: a 401 here means the
 * token expired mid-use, so it clears the store — AuthGuard reacts to
 * token becoming null and redirects to /login on its own. */
async function throwForAuthenticatedEndpointError(res: Response): Promise<never> {
  if (res.status === 401) {
    const apiError = await parseApiError(res);
    if (
      apiError.errorCode !== null &&
      _EXTERNAL_CREDENTIAL_ERROR_CODES.has(apiError.errorCode)
    ) {
      throw apiError;
    }
    useAuthStore.getState().clearToken();
    throw new SessionExpiredError();
  }
  if (res.status === 429) {
    throw new RateLimitError(parseRetryAfterSeconds(res));
  }
  throw await parseApiError(res);
}

export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  if (!res.ok) {
    return throwForPublicEndpointError(res);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function loginAsVisitor(): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/viewer-token`, { method: "POST" });
  if (!res.ok) {
    return throwForPublicEndpointError(res);
  }
  return res.json() as Promise<TokenResponse>;
}

export async function fetchGraph(cnpj: string, token: string): Promise<GraphSchema> {
  const res = await fetch(`${API_URL}/cnpj/${cnpj}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return res.json() as Promise<GraphSchema>;
}

export async function fetchGraphByCpf(
  cpf: string,
  token: string,
): Promise<GraphSchema> {
  const res = await fetch(`${API_URL}/cpf/${cpf}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return res.json() as Promise<GraphSchema>;
}

/** 204 means no sanctions were found for this CPF/CNPJ — a valid empty result. */
async function fetchSanctions(
  path: "cnep" | "ceis",
  cpfOrCnpj: string,
  token: string,
): Promise<GraphSchema | null> {
  const res = await fetch(`${API_URL}/${path}/${cpfOrCnpj}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) {
    return null;
  }
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return res.json() as Promise<GraphSchema>;
}

export function fetchCNEP(
  cpfOrCnpj: string,
  token: string,
): Promise<GraphSchema | null> {
  return fetchSanctions("cnep", cpfOrCnpj, token);
}

export function fetchCEIS(
  cpfOrCnpj: string,
  token: string,
): Promise<GraphSchema | null> {
  return fetchSanctions("ceis", cpfOrCnpj, token);
}

export async function fetchCredentialStatus(
  token: string,
): Promise<CredentialStatus[]> {
  const res = await fetch(`${API_URL}/credentials`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return res.json() as Promise<CredentialStatus[]>;
}

export async function fetchTextPatternSets(token: string): Promise<TextPatternSet[]> {
  const res = await fetch(`${API_URL}/text-ingestion/patterns`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return res.json() as Promise<TextPatternSet[]>;
}

export async function ingestText(
  text: string,
  patternSetId: string,
  token: string,
): Promise<GraphSchema> {
  const res = await fetch(`${API_URL}/text-ingestion`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, pattern_set_id: patternSetId }),
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return res.json() as Promise<GraphSchema>;
}

export async function saveCredential(
  provider: Provider,
  apiKey: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/credentials`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ api_key: apiKey, provider }),
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
}
