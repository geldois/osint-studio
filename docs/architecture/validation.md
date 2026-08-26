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

A rejected-credentials response on a public endpoint (signing in, requesting a visitor session) is never treated
the same as the same status on an endpoint that requires an existing session: the former means the attempt itself
was wrong and must never clear or redirect an unrelated session, the latter means the session's own token expired
mid-use and does clear it, letting the existing guard react to the token becoming absent. A stored external
provider credential being rejected returns the same status as an expired session but is deliberately excluded from
that clearing path, since only the external credential is bad — the session's own token is still good. An empty
result for a per-document lookup is its own distinct, successful status, never folded into the error path, since
finding nothing for a given document is a valid outcome, not a failure.

Only the error codes a normal user flow can actually trigger are translated to a message; a code the backend would
only ever attach to its own internal failure is deliberately left out and falls through to the same generic
message, since surfacing an internal code as if it meant something to the user would be worse than saying nothing
specific. A request that never reaches a server at all — offline, a DNS failure, a blocked connection — carries no
such code to key off, so that class of failure is recognized instead by the distinct, code-less error the browser
itself raises for it.

A stored credential's own errors surface through the settings menu's own status indicator rather than through a
banner built from the same generic error list every other failure feeds — showing both would mean the same problem
appearing twice in two different places on screen, so the generic list explicitly filters that class out and
collapses whatever duplicates remain, since one missing credential can fail more than one lookup identically in the
same batch.

## Consequences

A backend response that drops or renames a field now fails loudly, close to the network call, instead of surfacing
much later as a blank field or a silent `undefined` somewhere in render.

Adding a new API call means adding its schema alongside the existing ones, not writing a matching type by hand —
skipping the schema loses both the validation and the type in the same step, since the type no longer exists
independently.
