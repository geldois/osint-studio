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
