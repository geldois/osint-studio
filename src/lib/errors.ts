export class ApiError extends Error {
  readonly errorCode: string | null;

  constructor(message: string, errorCode: string | null) {
    super(message);
    this.name = "ApiError";
    this.errorCode = errorCode;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  EXTERNAL_CREDENTIAL_NOT_FOUND:
    "Nenhuma credencial configurada para o Portal da Transparência. Configure em Configurações.",
  EXTERNAL_CREDENTIAL_REJECTED:
    "A chave da API do Portal da Transparência foi rejeitada. Verifique em Configurações.",
};

export function translateError(error: unknown): string {
  if (error instanceof ApiError && error.errorCode !== null) {
    return ERROR_MESSAGES[error.errorCode] ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro desconhecido.";
}

const _CREDENTIAL_ERROR_CODES = new Set([
  "EXTERNAL_CREDENTIAL_NOT_FOUND",
  "EXTERNAL_CREDENTIAL_REJECTED",
]);

/** These surface via the settings button's warning icon instead of inline
 * text, so callers building an on-screen error banner should filter them out. */
export function isCredentialError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.errorCode !== null &&
    _CREDENTIAL_ERROR_CODES.has(error.errorCode)
  );
}
