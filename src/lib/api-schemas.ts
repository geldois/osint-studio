import { z } from "zod";

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
});

export const ProviderSchema = z.enum(["KIPFLOW", "PORTAL_TRANSPARENCIA"]);

export const CredentialStatusSchema = z.object({
  configured: z.boolean(),
  provider: ProviderSchema,
});

export const NodeTypeSchema = z.enum([
  "address",
  "cnae",
  "company",
  "email",
  "person",
  "phone",
  "sanction",
  "text_source",
]);

export const EdgeTypeSchema = z.enum([
  "address_mentioned_in_text",
  "company_has_cnae",
  "company_has_email",
  "company_has_member",
  "company_has_phone",
  "company_located_at",
  "company_mentioned_in_text",
  "company_owns_company",
  "company_received_sanction",
  "person_has_email",
  "person_has_phone",
  "person_mentioned_in_text",
  "person_owns_company",
  "person_received_sanction",
  "person_reside_at",
  "possibly_matches",
]);

export const AddressNodeSchema = z.object({
  id: z.string(),
  type: z.literal("address"),
  cep: z.string(),
  city: z.string().nullable(),
  complement: z.string().nullable(),
  neighborhood: z.string().nullable(),
  number: z.string(),
  state: z.string().nullable(),
  street: z.string().nullable(),
});

export const CnaeNodeSchema = z.object({
  id: z.string(),
  type: z.literal("cnae"),
  code: z.string(),
  description: z.string(),
});

export const CompanyNodeSchema = z.object({
  id: z.string(),
  type: z.literal("company"),
  cnpj: z.string(),
  legal_name: z.string().nullable(),
  trade_name: z.string().nullable(),
  registration_status: z.string().nullable(),
  registration_status_date: z.string().nullable(),
  registration_status_reason: z.string().nullable(),
  size_category: z.string().nullable(),
  legal_nature: z.string().nullable(),
  share_capital: z.string().nullable(),
  activity_start_date: z.string().nullable(),
  is_headquarters: z.boolean().nullable(),
});

export const EmailNodeSchema = z.object({
  id: z.string(),
  type: z.literal("email"),
  address: z.string(),
});

export const PersonNodeSchema = z.object({
  id: z.string(),
  type: z.literal("person"),
  age_range: z.string().nullable(),
  birthdate: z.string().nullable(),
  cpf: z.string(),
  name: z.string().nullable(),
  registration_date: z.string().nullable(),
  registration_status: z.string().nullable(),
});

export const TextSourceNodeSchema = z.object({
  id: z.string(),
  type: z.literal("text_source"),
  text: z.string(),
});

export const PhoneNodeSchema = z.object({
  id: z.string(),
  type: z.literal("phone"),
  number: z.string(),
});

export const SanctionNodeSchema = z.object({
  id: z.string(),
  type: z.literal("sanction"),
  end_date: z.string().nullable(),
  fine_amount: z.string().nullable(),
  legal_basis: z.array(z.string()),
  organ: z.enum(["CEIS", "CNEP"]),
  process_number: z.string().nullable(),
  publication_date: z.string().nullable(),
  publication_link: z.string(),
  sanction_type: z.string(),
  sanctioning_body: z.string(),
  start_date: z.string().nullable(),
});

export const ApiNodeSchema = z.discriminatedUnion("type", [
  AddressNodeSchema,
  CnaeNodeSchema,
  CompanyNodeSchema,
  EmailNodeSchema,
  PersonNodeSchema,
  PhoneNodeSchema,
  SanctionNodeSchema,
  TextSourceNodeSchema,
]);

const EdgeBaseSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  target_id: z.string(),
});

export const OwnsCompanyEdgeSchema = EdgeBaseSchema.extend({
  type: z.literal(["company_owns_company", "person_owns_company"]),
  entry_date: z.string(),
  role: z.string(),
});

export const MentionedInTextEdgeSchema = EdgeBaseSchema.extend({
  type: z.literal([
    "address_mentioned_in_text",
    "company_mentioned_in_text",
    "person_mentioned_in_text",
  ]),
  matched_field: z.string(),
  pattern_name: z.string(),
});

export const PossiblyMatchesEdgeSchema = EdgeBaseSchema.extend({
  type: z.literal("possibly_matches"),
  confidence: z.string(),
});

export const PlainEdgeSchema = EdgeBaseSchema.extend({
  type: z.literal([
    "company_has_cnae",
    "company_has_email",
    "company_has_member",
    "company_has_phone",
    "company_located_at",
    "company_received_sanction",
    "person_has_email",
    "person_has_phone",
    "person_received_sanction",
    "person_reside_at",
  ]),
});

export const ApiEdgeSchema = z.discriminatedUnion("type", [
  OwnsCompanyEdgeSchema,
  MentionedInTextEdgeSchema,
  PossiblyMatchesEdgeSchema,
  PlainEdgeSchema,
]);

export const GraphSchemaSchema = z.object({
  root_id: z.string(),
  nodes: z.array(ApiNodeSchema),
  edges: z.array(ApiEdgeSchema),
});

export const TextPatternNameSchema = z.object({
  name: z.string(),
  node_type: z.string(),
  fields: z.array(z.string()),
});

export const TextPatternBundleSchema = z.object({
  id: z.string(),
  pattern_names: z.array(z.string()),
});

export const TextPatternCatalogSchema = z.object({
  patterns: z.array(TextPatternNameSchema),
  bundles: z.array(TextPatternBundleSchema),
});
