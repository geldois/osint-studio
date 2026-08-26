import { z } from "zod";
import {
  ApiEdgeSchema,
  ApiNodeSchema,
  BatchCPFEstimateSchema,
  BatchCPFResultSchema,
  CredentialStatusSchema,
  GraphCatalogSchema,
  GraphSchemaSchema,
  TextPatternCatalogSchema,
  TokenResponseSchema,
} from "@/lib/api-schemas";
import { ApiError, UNKNOWN_ERROR_MESSAGE } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import type {
  ApiEdge,
  ApiNode,
  BatchCPFEstimate,
  BatchCPFResult,
  CredentialStatus,
  GraphCatalog,
  GraphSchema,
  Provider,
  TextPatternCatalog,
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

export class ApiSchemaError extends Error {
  override readonly cause: z.ZodError;

  constructor(cause: z.ZodError) {
    super(UNKNOWN_ERROR_MESSAGE, { cause });
    this.name = "ApiSchemaError";
    this.cause = cause;
  }
}

async function parseJson<T>(schema: z.ZodType<T>, res: Response): Promise<T> {
  const result = schema.safeParse(await res.json());
  if (!result.success) {
    throw new ApiSchemaError(result.error);
  }
  return result.data;
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

async function throwForPublicEndpointError(res: Response): Promise<never> {
  if (res.status === 429) {
    throw new RateLimitError(parseRetryAfterSeconds(res));
  }
  throw await parseApiError(res);
}

const _EXTERNAL_CREDENTIAL_ERROR_CODES = new Set(["EXTERNAL_CREDENTIAL_REJECTED"]);

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
  return parseJson(TokenResponseSchema, res);
}

export async function loginAsVisitor(): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/viewer-token`, { method: "POST" });
  if (!res.ok) {
    return throwForPublicEndpointError(res);
  }
  return parseJson(TokenResponseSchema, res);
}

export async function fetchGraph(cnpj: string, token: string): Promise<GraphSchema> {
  const res = await fetch(`${API_URL}/cnpj/${cnpj}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(GraphSchemaSchema, res);
}

export async function fetchGraphByCpf(
  cpf: string,
  token: string,
): Promise<GraphSchema | null> {
  const res = await fetch(`${API_URL}/cpf/${cpf}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) {
    return null;
  }
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(GraphSchemaSchema, res);
}

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
  return parseJson(GraphSchemaSchema, res);
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

export async function fetchGraphCatalog(token: string): Promise<GraphCatalog> {
  const res = await fetch(`${API_URL}/graphs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(GraphCatalogSchema, res);
}

export async function fetchGraphHistory(
  rootId: string,
  token: string,
): Promise<GraphSchema[]> {
  const res = await fetch(`${API_URL}/graphs/${rootId}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(z.array(GraphSchemaSchema), res);
}

export async function fetchNodeHistory(
  nodeId: string,
  token: string,
): Promise<ApiNode[]> {
  const res = await fetch(`${API_URL}/nodes/${nodeId}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(z.array(ApiNodeSchema), res);
}

export async function fetchEdgeHistory(
  edgeId: string,
  token: string,
): Promise<ApiEdge[]> {
  const res = await fetch(`${API_URL}/edges/${edgeId}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(z.array(ApiEdgeSchema), res);
}

export async function estimateCpfBatch(
  cpfs: string[],
  token: string,
): Promise<BatchCPFEstimate> {
  const res = await fetch(`${API_URL}/cpf/batch/estimate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cpfs }),
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(BatchCPFEstimateSchema, res);
}

export async function expandCpfBatch(
  cpfs: string[],
  force: boolean,
  token: string,
): Promise<BatchCPFResult> {
  const res = await fetch(`${API_URL}/cpf/batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cpfs, force }),
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(BatchCPFResultSchema, res);
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
  return parseJson(z.array(CredentialStatusSchema), res);
}

export async function fetchTextPatternCatalog(
  token: string,
): Promise<TextPatternCatalog> {
  const res = await fetch(`${API_URL}/text-ingestion/patterns`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(TextPatternCatalogSchema, res);
}

export async function ingestText(
  text: string,
  patterns: string[],
  token: string,
): Promise<GraphSchema> {
  const res = await fetch(`${API_URL}/text-ingestion`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, patterns }),
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(GraphSchemaSchema, res);
}

export async function ingestFile(
  file: File,
  patterns: string[],
  token: string,
): Promise<GraphSchema> {
  const body = new FormData();
  body.append("file", file);
  for (const pattern of patterns) {
    body.append("patterns", pattern);
  }
  const res = await fetch(`${API_URL}/text-ingestion/file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) {
    return throwForAuthenticatedEndpointError(res);
  }
  return parseJson(GraphSchemaSchema, res);
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
