export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export type Provider = "KIPFLOW" | "PORTAL_TRANSPARENCIA";

export interface CredentialStatus {
  configured: boolean;
  provider: Provider;
}

export type NodeType =
  | "address"
  | "cnae"
  | "company"
  | "email"
  | "person"
  | "phone"
  | "sanction"
  | "text_source";

export type EdgeType =
  | "address_mentioned_in_text"
  | "company_has_cnae"
  | "company_has_email"
  | "company_has_member"
  | "company_has_phone"
  | "company_located_at"
  | "company_mentioned_in_text"
  | "company_received_sanction"
  | "person_has_email"
  | "person_has_phone"
  | "person_mentioned_in_text"
  | "person_owns_company"
  | "person_received_sanction"
  | "person_reside_at"
  | "possibly_matches";

/** Fields left `null` here (rather than the identifying field the regex
 * matched, e.g. `cep`/`number`) are what a text-ingestion stub hasn't been
 * enriched with yet — the same node type doubles as a full BrasilAPI/Portal
 * result once expanded. */
export interface AddressNode {
  id: string;
  type: "address";
  cep: string;
  city: string | null;
  complement: string | null;
  neighborhood: string | null;
  number: string;
  state: string | null;
  street: string | null;
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
  legal_name: string | null;
  trade_name: string | null;
  registration_status: string | null;
  registration_status_date: string | null;
  registration_status_reason: string | null;
  size_category: string | null;
  legal_nature: string | null;
  share_capital: string | null;
  activity_start_date: string | null;
  is_headquarters: boolean | null;
}

export interface EmailNode {
  id: string;
  type: "email";
  address: string;
}

export interface PersonNode {
  id: string;
  type: "person";
  age_range: string | null;
  cpf: string;
  name: string | null;
  registration_date: string | null;
  registration_status: string | null;
}

export interface TextSourceNode {
  id: string;
  type: "text_source";
  text: string;
}

export interface PhoneNode {
  id: string;
  type: "phone";
  number: string;
}

export interface SanctionNode {
  id: string;
  type: "sanction";
  end_date: string | null;
  fine_amount: string | null;
  legal_basis: string[];
  organ: "CEIS" | "CNEP";
  process_number: string | null;
  publication_date: string | null;
  publication_link: string;
  sanction_type: string;
  sanctioning_body: string;
  start_date: string | null;
}

export type ApiNode =
  | AddressNode
  | CnaeNode
  | CompanyNode
  | EmailNode
  | PersonNode
  | PhoneNode
  | SanctionNode
  | TextSourceNode;

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

type MentionedInTextEdgeType =
  | "address_mentioned_in_text"
  | "company_mentioned_in_text"
  | "person_mentioned_in_text";

export interface MentionedInTextEdge extends EdgeBase {
  type: MentionedInTextEdgeType;
  matched_field: string;
  pattern_id: string;
}

export interface PossiblyMatchesEdge extends EdgeBase {
  type: "possibly_matches";
  confidence: string;
}

export interface PlainEdge extends EdgeBase {
  type: Exclude<
    EdgeType,
    "person_owns_company" | "possibly_matches" | MentionedInTextEdgeType
  >;
}

export type ApiEdge =
  PersonOwnsCompanyEdge | MentionedInTextEdge | PossiblyMatchesEdge | PlainEdge;

export interface GraphSchema {
  root_id: string;
  nodes: ApiNode[];
  edges: ApiEdge[];
}

export interface TextPatternSet {
  id: string;
  patterns: { node_type: string; fields: string[] }[];
}
