import type { Role } from "@/store/auth";

/** Document types the app can fetch, one per backend route. Extend this list
 * as osint-engine adds new fetchable routes. */
export type FetchDocumentType = "cnpj" | "cpf";

const ALLOWED_DOCUMENT_TYPES: Record<Role, FetchDocumentType[]> = {
  VIEWER: ["cnpj"],
  ADMIN: ["cnpj", "cpf"],
};

/** Frontend-side gating only, mirroring the backend's per-route role guard
 * (osint-engine docs/architecture/interface.md) so the UI doesn't offer
 * actions the API will reject — the backend remains the actual source of
 * truth. */
export function canFetchDocumentType(
  role: Role | null,
  type: FetchDocumentType,
): boolean {
  return role !== null && ALLOWED_DOCUMENT_TYPES[role].includes(type);
}
