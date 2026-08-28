const CPF_DIGIT_COUNT = 11;
const CNPJ_DIGIT_COUNT = 14;

export function isCpf(value: string): boolean {
  return value.replace(/\D/g, "").length === CPF_DIGIT_COUNT;
}

export type DocumentKind = "cnpj" | "cpf";

export function documentKind(value: string): DocumentKind | null {
  switch (value.replace(/\D/g, "").length) {
    case CPF_DIGIT_COUNT:
      return "cpf";
    case CNPJ_DIGIT_COUNT:
      return "cnpj";
    default:
      return null;
  }
}

const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  cnpj: "CNPJ",
  cpf: "CPF",
};

export function documentKindLabel(kind: DocumentKind): string {
  return DOCUMENT_KIND_LABELS[kind];
}

export function isMaskedCpf(value: string): boolean {
  return value.includes("*");
}

export function isConsumableCpf(value: string): boolean {
  return isCpf(value) && !isMaskedCpf(value);
}
