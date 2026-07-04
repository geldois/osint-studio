# 4. Stronger node idempotency via identity_fields subset

## Status

Accepted — Partially supersedes [ADR-0002](0002-incremental-graph-accumulator.md)
(node idempotency section only; edge idempotency, layout, and fetching are unchanged)

## Context

ADR-0002 documented node idempotency as a consequence of osint-engine hashing all
constructor kwargs into a `uuid5`. It noted a caveat: dedup held only when the backend
returned byte-identical field values across calls — a partner's name formatted
differently in two responses would produce different ids and appear twice on the canvas.
This was recorded as a backend data-quality concern.

In the interim, osint-engine introduced `identity_fields` (ADR-0010 in osint-engine):
each entity type now declares the subset of its fields that constitute its natural key —
`{cpf}` for Person, `{cnpj}` for Company, `{cep, number}` for Address, etc. Only those
fields are forwarded to `_calculate_id`; descriptive fields (name, age range, trade
name, registration status, …) are stored as attributes but do not affect the id.

## Decision

No change is needed in osint-studio. The merge logic in `mergeGraph` deduplicates
by `node.id` exactly as before. What changes is the strength of the guarantee that
backs it: osint-engine's node ids are now stable under variation in descriptive fields,
so the caveat in ADR-0002 no longer applies. A person queried as a QSA of company A
and again as a QSA of company B will produce the same id even if the API returns
slightly different name formatting across the two calls, as long as the CPF is
consistent — which is structurally guaranteed for a normalized key.

## Consequences

- **Gained:** the idempotency guarantee the frontend relies on is now structurally
  enforced by the backend contract, not merely hoped for via data-quality discipline.
  The ADR-0002 caveat is eliminated.
- **No frontend change required:** `mergeGraph` deduplicates by `id`; the stronger
  upstream guarantee flows through transparently.
- **Acknowledged:** the guarantee is only as strong as the identity key itself. CPF and
  CNPJ are normalized Brazilian document numbers with fixed formats — they are reliable
  natural keys. Address identity (`cep + number`) is also normalized. These are not
  arbitrary strings; the design is sound for the domain.
