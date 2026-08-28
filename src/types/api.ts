import type { z } from "zod";
import type {
  AddressNodeSchema,
  ApiEdgeSchema,
  ApiNodeSchema,
  BatchCPFEstimateSchema,
  BatchCPFOutcomeSchema,
  BatchCPFResultSchema,
  CnaeNodeSchema,
  CompanyNodeSchema,
  CredentialStatusSchema,
  EdgeTypeSchema,
  EmailNodeSchema,
  EntityRecordSchema,
  EntityRefSchema,
  GraphCatalogEntrySchema,
  GraphCatalogSchema,
  GraphSchemaSchema,
  LegalProcessNodeSchema,
  MentionedInTextEdgeSchema,
  NodeTypeSchema,
  OwnsCompanyEdgeSchema,
  PersonNodeSchema,
  PhoneNodeSchema,
  PlainEdgeSchema,
  PoliticalExposureNodeSchema,
  PossiblyMatchesEdgeSchema,
  ProviderSchema,
  RevisionSchema,
  SanctionNodeSchema,
  TextPatternBundleSchema,
  TextPatternCatalogSchema,
  TextPatternNameSchema,
  TextSourceNodeSchema,
  TokenResponseSchema,
} from "@/lib/api-schemas";

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type Revision = z.infer<typeof RevisionSchema>;

export type AddressNode = z.infer<typeof AddressNodeSchema>;
export type CnaeNode = z.infer<typeof CnaeNodeSchema>;
export type CompanyNode = z.infer<typeof CompanyNodeSchema>;
export type EmailNode = z.infer<typeof EmailNodeSchema>;
export type LegalProcessNode = z.infer<typeof LegalProcessNodeSchema>;
export type PersonNode = z.infer<typeof PersonNodeSchema>;
export type TextSourceNode = z.infer<typeof TextSourceNodeSchema>;
export type PhoneNode = z.infer<typeof PhoneNodeSchema>;
export type PoliticalExposureNode = z.infer<typeof PoliticalExposureNodeSchema>;
export type SanctionNode = z.infer<typeof SanctionNodeSchema>;
export type ApiNode = z.infer<typeof ApiNodeSchema>;

export type OwnsCompanyEdge = z.infer<typeof OwnsCompanyEdgeSchema>;
export type MentionedInTextEdge = z.infer<typeof MentionedInTextEdgeSchema>;
export type PossiblyMatchesEdge = z.infer<typeof PossiblyMatchesEdgeSchema>;
export type PlainEdge = z.infer<typeof PlainEdgeSchema>;
export type ApiEdge = z.infer<typeof ApiEdgeSchema>;

export type GraphSchema = z.infer<typeof GraphSchemaSchema>;
export type TextPatternName = z.infer<typeof TextPatternNameSchema>;
export type TextPatternBundle = z.infer<typeof TextPatternBundleSchema>;
export type TextPatternCatalog = z.infer<typeof TextPatternCatalogSchema>;

export type GraphCatalogEntry = z.infer<typeof GraphCatalogEntrySchema>;
export type GraphCatalog = z.infer<typeof GraphCatalogSchema>;
export type BatchCPFEstimate = z.infer<typeof BatchCPFEstimateSchema>;
export type BatchCPFOutcome = z.infer<typeof BatchCPFOutcomeSchema>;
export type BatchCPFResult = z.infer<typeof BatchCPFResultSchema>;

export type EntityRef = z.infer<typeof EntityRefSchema>;
export type EntityRecord = z.infer<typeof EntityRecordSchema>;
