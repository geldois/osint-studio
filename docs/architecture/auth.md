# Auth — what it does

A visitor can obtain a public, credential-free session in addition to the existing authenticated one, and the
interface needs to know which kind of session is active — at minimum to label it, eventually to hide controls a
lesser session could never use anyway. Which kind of session is active travels inside the same signed token the
session already carries, as one more claim alongside the session's own credentials. A session outlives a page
load and ends only when the person ends it or the token itself expires.

## Decisions

Reading that claim is done by decoding the token's own payload directly on this side, without verifying its
signature, rather than asking the backend to return the same value as a separate, explicit field. This is safe
only because the value is ever used for display, never as a basis for granting access: every real authorization
boundary is enforced server-side, independent of and blind to whatever the client believes its own session type to
be — a tampered or self-crafted claim can only mislead the interface's own display, never grant anything the
server would not have granted anyway.

The session is kept in storage scoped to the browser tab rather than in memory alone or in storage that outlives
the browser entirely. Memory alone meant every reload — a refresh, a restored tab, a typed URL — silently ended a
session the server still considered valid, which reads as a bug rather than as security. Storage that survives the
browser closing would keep a bearer token readable on a shared machine indefinitely, buying nothing for a tool
used in sittings. Tab-scoped storage ends the session when the tab closes and survives everything shorter, which
is the actual shape of how the tool is used. The cost is that a second tab is a second session and needs its own
login.

Restoring a session re-derives the session type from the stored token instead of storing it alongside. The two
would be written together and could only ever diverge by tampering, and while that tampering could mislead nothing
but this side's own display, deriving it costs one function call and removes the possibility by construction.

A restored token is checked for expiry before being trusted, and a token whose expiry cannot be read at all is
treated as expired. This is not an authorization decision — the server independently rejects anything stale, and
the existing path that ends a session on a rejected request still runs. It only avoids presenting a working
interface that is guaranteed to fail on its first request.

Nothing ends a session while a tab sits open and idle past the token's expiry; that is noticed on the next request
and handled by the path that already existed. Arming a timer at the expiry moment would end it more gracefully,
and was left out because a client-side clock has to stay correct across a suspended tab, a hibernated machine and
an adjusted system clock, which is real complexity spent on a transition that is already handled.

## Consequences

Restoring a session is asynchronous, so there is a moment where the interface knows neither that a session exists
nor that one doesn't. Treating that moment as "no session" would redirect to the login screen before storage was
ever read, which would defeat the persistence entirely — so the guard waits for the restore to settle before
deciding anything, and any future check on session presence has to wait for the same signal rather than reading
the session directly.

Any future control hidden from a lesser session on this basis remains a convenience, never a security boundary in
its own right — the corresponding server-side route must independently enforce the same restriction regardless of
what the interface shows or hides. Reading one more claim out of the same decoded payload later needs no backend
change, since the whole payload is already sitting decoded once the token is set.
