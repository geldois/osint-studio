import type { Role } from "@/store/auth";

export type FetchDocumentType = "cnpj" | "cpf";

const ALLOWED_DOCUMENT_TYPES: Record<Role, FetchDocumentType[]> = {
  VIEWER: ["cnpj"],
  ADMIN: ["cnpj", "cpf"],
};

export function canFetchDocumentType(
  role: Role | null,
  type: FetchDocumentType,
): boolean {
  return role !== null && ALLOWED_DOCUMENT_TYPES[role].includes(type);
}
