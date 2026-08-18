# Auth — what it does

A visitor can obtain a public, credential-free session in addition to the existing authenticated one, and the
interface needs to know which kind of session is active — at minimum to label it, eventually to hide controls a
lesser session could never use anyway. Which kind of session is active travels inside the same signed token the
session already carries, as one more claim alongside the session's own credentials.

## Decisions

Reading that claim is done by decoding the token's own payload directly on this side, without verifying its
signature, rather than asking the backend to return the same value as a separate, explicit field. This is safe
only because the value is ever used for display, never as a basis for granting access: every real authorization
boundary is enforced server-side, independent of and blind to whatever the client believes its own session type to
be — a tampered or self-crafted claim can only mislead the interface's own display, never grant anything the
server would not have granted anyway.

## Consequences

Any future control hidden from a lesser session on this basis remains a convenience, never a security boundary in
its own right — the corresponding server-side route must independently enforce the same restriction regardless of
what the interface shows or hides. Reading one more claim out of the same decoded payload later needs no backend
change, since the whole payload is already sitting decoded once the token is set.
