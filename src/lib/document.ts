const CPF_DIGIT_COUNT = 11;

/** Mirrors the backend's sanitize_cpf_or_cnpj: 11 digits is a CPF, anything
 * else is treated as a CNPJ attempt and left for the backend to reject. */
export function isCpf(value: string): boolean {
  return value.replace(/\D/g, "").length === CPF_DIGIT_COUNT;
}

export function isMaskedCpf(value: string): boolean {
  return value.includes("*");
}

export function isConsumableCpf(value: string): boolean {
  return isCpf(value) && !isMaskedCpf(value);
}
