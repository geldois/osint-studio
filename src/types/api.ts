export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export type NodeType =
  "address" | "cnae" | "company" | "email" | "person" | "phone" | "sanction";

export type EdgeType =
  | "company_has_cnae"
  | "company_has_email"
  | "company_has_member"
  | "company_has_phone"
  | "company_located_at"
  | "company_received_sanction"
  | "person_has_email"
  | "person_has_phone"
  | "person_owns_company"
  | "person_received_sanction"
  | "person_reside_at";

export interface AddressNode {
  id: string;
  type: "address";
  cep: string;
  city: string;
  complement: string;
  neighborhood: string;
  number: string;
  state: string;
  street: string;
}

export interface CnaeNode {
  id: string;
  type: "cnae";
  code: string;
  description: string;
}

export interface CompanyNode {
  id: string;
  type: "company";
  cnpj: string;
  legal_name: string;
  trade_name: string;
  registration_status: string;
  registration_status_date: string;
  registration_status_reason: string;
  size_category: string;
  legal_nature: string;
  share_capital: string;
  activity_start_date: string;
  is_headquarters: boolean;
}

export interface EmailNode {
  id: string;
  type: "email";
  address: string;
}

export interface PersonNode {
  id: string;
  type: "person";
  age_range: string;
  cpf: string;
  name: string;
}

export interface PhoneNode {
  id: string;
  type: "phone";
  number: string;
}

export interface SanctionNode {
  id: string;
  type: "sanction";
  organ: "CEIS" | "CNEP";
}

export type ApiNode =
  | AddressNode
  | CnaeNode
  | CompanyNode
  | EmailNode
  | PersonNode
  | PhoneNode
  | SanctionNode;

interface EdgeBase {
  id: string;
  source_id: string;
  target_id: string;
}

export interface PersonOwnsCompanyEdge extends EdgeBase {
  type: "person_owns_company";
  entry_date: string;
  role: string;
}

export interface PlainEdge extends EdgeBase {
  type: Exclude<EdgeType, "person_owns_company">;
}

export type ApiEdge = PersonOwnsCompanyEdge | PlainEdge;

export interface GraphSchema {
  root_id: string;
  nodes: ApiNode[];
  edges: ApiEdge[];
}
