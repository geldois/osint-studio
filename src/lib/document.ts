const CPF_DIGIT_COUNT = 11;

export function isCpf(value: string): boolean {
  return value.replace(/\D/g, "").length === CPF_DIGIT_COUNT;
}

export function isMaskedCpf(value: string): boolean {
  return value.includes("*");
}

export function isConsumableCpf(value: string): boolean {
  return isCpf(value) && !isMaskedCpf(value);
}
