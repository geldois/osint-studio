export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
};

export type NodeType =
  | "address"
  | "cnae"
  | "company"
  | "email"
  | "person"
  | "phone"
  | "sanction";

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

export type ApiNode = {
  id: string;
  type: NodeType;
  [key: string]: unknown;
};

export type ApiEdge = {
  id: string;
  type: EdgeType;
  source_id: string;
  target_id: string;
};

export type GraphSchema = {
  root_id: string;
  nodes: ApiNode[];
  edges: ApiEdge[];
};
