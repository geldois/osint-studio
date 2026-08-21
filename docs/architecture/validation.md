# Validation — what it does

Every API response with a JSON body is parsed against a Zod schema before the caller sees it, instead of a bare
type-cast. The three data-entry forms (login, credential, text-ingestion) validate their fields with the same
library before submitting, instead of tracking each field in its own bit of state.

## Decisions

Zod was picked over hand-rolled parsing or a lighter schema library because it's the de facto standard for
runtime validation in this ecosystem, with first-class support from the form library chosen alongside it —
react-hook-form is the dominant form library for React, and its official Zod resolver auto-detects the schema
version, so no glue code of its own was needed.

The type layer changed direction to match: every API type is now inferred from its Zod schema rather than the
schema being written to match a hand-written type. One definition, not two kept in sync by hand.

Schema coverage went beyond the one login/Expansion boundary originally flagged as missing validation — every
JSON-returning API call now validates its response, since none of the others are structurally different or
riskier to cover, and leaving some uncovered would just reopen the same gap later under a different name.

One field is checked for its format and not merely its presence: the timestamp naming when the backend fetched a
graph. Every other date on a response is passed through from an upstream registry in whatever shape that registry
publishes, so a format check there would reject valid data; this one is minted by the backend itself, which already
refuses to build a revision whose timestamps are not UTC. The UI orders revisions by doing arithmetic on it, and an
unparseable value would otherwise surface as an invalid date inside a menu rather than as a rejected response,
which is the whole failure mode this boundary exists to catch.

A failed response parse surfaces to the user as the same generic, already-existing "unexpected error" message —
never the parser's own technical detail, since a shape mismatch is a backend drift bug the user can't act on, the
same reasoning already applied to server error codes with no user-facing meaning.

## Consequences

A backend response that drops or renames a field now fails loudly, close to the network call, instead of surfacing
much later as a blank field or a silent `undefined` somewhere in render.

Adding a new API call means adding its schema alongside the existing ones, not writing a matching type by hand —
skipping the schema loses both the validation and the type in the same step, since the type no longer exists
independently.
