export class ApiError extends Error {
  readonly errorCode: string | null;

  constructor(message: string, errorCode: string | null) {
    super(message);
    this.name = "ApiError";
    this.errorCode = errorCode;
  }
}

/** Every error_code the backend can attach to a 4xx response that a normal
 * user flow can trigger (see osint-engine's http_status_mapper.py). 5xx
 * codes (data source/schema/UoW failures) are deliberately not enumerated
 * here — those are backend bugs, not situations the user can act on, so
 * they fall through to a generic message below instead of leaking an
 * internal error_code as if it meant something to the user. */
const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "Usuário ou senha incorretos.",
  AUTHORIZATION_INSUFFICIENT_ROLE: "Sua conta não tem permissão para esta ação.",
  ENTITY_NOT_FOUND: "Nenhum registro encontrado para este documento.",
  EXTERNAL_CREDENTIAL_NOT_FOUND:
    "Uma credencial necessária não está configurada. Confira o status de cada fonte em Configurações.",
  EXTERNAL_CREDENTIAL_REJECTED:
    "Uma credencial foi rejeitada pela fonte de dados. Confira o status de cada fonte em Configurações.",
  PROVIDER_INSUFFICIENT_CREDITS:
    "Saldo insuficiente na KipFlow para esta consulta. Verifique o saldo em platform.kipflow.io.",
  SANITIZATION_INVALID_CNPJ: "CNPJ inválido. Confira os 14 dígitos e tente novamente.",
  SANITIZATION_INVALID_CPF: "CPF inválido. Confira os 11 dígitos e tente novamente.",
  SANITIZATION_INVALID_CPF_OR_CNPJ:
    "Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.",
  TEXT_INGESTION_NO_PATTERN_MATCHED:
    "Nenhum CPF, CNPJ ou CEP com número foi encontrado nesse texto.",
  TEXT_INGESTION_PATTERN_SET_NOT_FOUND:
    "Conjunto de padrões de extração não encontrado.",
};

const GENERIC_CLIENT_ERROR_MESSAGE =
  "Não foi possível concluir a operação. Tente novamente.";
const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
export const UNKNOWN_ERROR_MESSAGE = "Ocorreu um erro inesperado. Tente novamente.";

/** `fetch` rejects with a bare `TypeError` (message varies by browser —
 * "Failed to fetch", "Load failed", "NetworkError when attempting to fetch
 * resource"…) whenever the request never reaches a server: offline, DNS
 * failure, CORS block, connection refused. There's no `error_code` to key
 * off, so browser-thrown `TypeError` is itself the signal. */
function isNetworkError(error: unknown): error is TypeError {
  return error instanceof TypeError;
}

export function translateError(error: unknown): string {
  if (isNetworkError(error)) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (error instanceof ApiError) {
    if (error.errorCode !== null && error.errorCode in ERROR_MESSAGES) {
      return ERROR_MESSAGES[error.errorCode] ?? GENERIC_CLIENT_ERROR_MESSAGE;
    }
    return GENERIC_CLIENT_ERROR_MESSAGE;
  }
  // RateLimitError and SessionExpiredError (lib/api.ts) already carry a
  // curated pt-BR message meant for direct display.
  if (error instanceof Error) {
    return error.message || UNKNOWN_ERROR_MESSAGE;
  }
  return UNKNOWN_ERROR_MESSAGE;
}

const _CREDENTIAL_ERROR_CODES = new Set([
  "EXTERNAL_CREDENTIAL_NOT_FOUND",
  "EXTERNAL_CREDENTIAL_REJECTED",
]);

/** These surface via the settings menu's warning badge instead of inline
 * text, so callers building an on-screen error banner should filter them out. */
export function isCredentialError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.errorCode !== null &&
    _CREDENTIAL_ERROR_CODES.has(error.errorCode)
  );
}

/** Renders the per-source failures from a `useExpand` result as a banner-ready
 * list of messages: credential errors are dropped (they surface via the
 * settings menu's badge instead) and duplicate messages are collapsed, since
 * one missing credential fails every sanction-source fetch identically. */
export function visibleErrorMessages(errors: readonly unknown[]): string[] {
  return [...new Set(errors.filter((e) => !isCredentialError(e)).map(translateError))];
}
