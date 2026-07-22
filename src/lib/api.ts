import { useAuthStore } from "@/store/auth";
import type { GraphSchema, TokenResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Limite de requisições atingido.");
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

async function parseErrorDetail(res: Response): Promise<string> {
  const { detail } = (await res.json()) as { detail: string };
  return detail;
}

/** For unauthenticated endpoints (login, viewer-token): a 401 here means
 * rejected credentials, not an expired session — it must not clear the
 * token or redirect. */
async function throwForPublicEndpointError(res: Response): Promise<never> {
  if (res.status === 429) {
    throw new RateLimitError(parseRetryAfterSeconds(res));
  }
  throw new Error(await parseErrorDetail(res));
}

/** For endpoints that require an existing session: a 401 here means the
 * token expired mid-use, so it clears the store — AuthGuard reacts to
 * token becoming null and redirects to /login on its own. */
async function throwForAuthenticatedEndpointError(res: Response): Promise<never> {
  if (res.status === 401) {
    useAuthStore.getState().clearToken();
    throw new SessionExpiredError();
  }
  if (res.status === 429) {
    throw new RateLimitError(parseRetryAfterSeconds(res));
  }
  throw new Error(await parseErrorDetail(res));
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
