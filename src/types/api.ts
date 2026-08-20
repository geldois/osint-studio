import type { z } from "zod";
import type {
  AddressNodeSchema,
  ApiEdgeSchema,
  ApiNodeSchema,
  CnaeNodeSchema,
  CompanyNodeSchema,
  CredentialStatusSchema,
  EdgeTypeSchema,
  EmailNodeSchema,
  GraphSchemaSchema,
  MentionedInTextEdgeSchema,
  NodeTypeSchema,
  PersonNodeSchema,
  PersonOwnsCompanyEdgeSchema,
  PhoneNodeSchema,
  PlainEdgeSchema,
  PossiblyMatchesEdgeSchema,
  ProviderSchema,
  SanctionNodeSchema,
  TextPatternSetSchema,
  TextSourceNodeSchema,
  TokenResponseSchema,
} from "@/lib/api-schemas";

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export type AddressNode = z.infer<typeof AddressNodeSchema>;
export type CnaeNode = z.infer<typeof CnaeNodeSchema>;
export type CompanyNode = z.infer<typeof CompanyNodeSchema>;
export type EmailNode = z.infer<typeof EmailNodeSchema>;
export type PersonNode = z.infer<typeof PersonNodeSchema>;
export type TextSourceNode = z.infer<typeof TextSourceNodeSchema>;
export type PhoneNode = z.infer<typeof PhoneNodeSchema>;
export type SanctionNode = z.infer<typeof SanctionNodeSchema>;
export type ApiNode = z.infer<typeof ApiNodeSchema>;

export type PersonOwnsCompanyEdge = z.infer<typeof PersonOwnsCompanyEdgeSchema>;
export type MentionedInTextEdge = z.infer<typeof MentionedInTextEdgeSchema>;
export type PossiblyMatchesEdge = z.infer<typeof PossiblyMatchesEdgeSchema>;
export type PlainEdge = z.infer<typeof PlainEdgeSchema>;
export type ApiEdge = z.infer<typeof ApiEdgeSchema>;

export type GraphSchema = z.infer<typeof GraphSchemaSchema>;
export type TextPatternSet = z.infer<typeof TextPatternSetSchema>;
