# 5. Client-side role decoding is display-only, never an authorization source

## Status

Accepted

## Context

osint-engine added a public `VIEWER` role (`POST /auth/viewer-token`, no credential) alongside the existing `ADMIN`
role, both carried in the JWT's `role` claim. The UI needs to know which role is active — at minimum to label the
session, eventually to hide admin-only controls from a visitor. Two ways to get that value into the store were
considered: have the backend return `role` explicitly in `TokenSchema`, or decode it from the token payload already
in hand.

## Decision

`useAuthStore.setToken` decodes the JWT's middle (payload) segment — base64url, no padding — and reads `role`
directly, without verifying the signature. This is safe specifically because the value is used for display only:
every real permission boundary (`/cnpj` vs `/credentials`) is enforced server-side by `build_role_guard`
(osint-engine, [ADR-0020](https://github.com/geldois/osint-engine/blob/main/docs/adr/0020-role-guard-for-per-route-authorization.md)),
which returns `403` independent of anything the client believes about its own role. Decoding avoids a backend
contract change (`TokenSchema` stays `{access_token, token_type}`) for a need that is purely presentational.

## Consequences

- A tampered or self-crafted `role` claim can only mislead the client's own display — it cannot grant access to
  anything, since the backend never trusts a client-asserted role.
- If a future UI feature hides admin-only controls from a `VIEWER` session, it still gets that from this same decoded
  value — but that UI-level hiding is a convenience, not a security boundary; the corresponding backend route must
  independently enforce the restriction regardless of what the UI shows or hides.
- Adding another display-only claim later (e.g. token expiry, for a "session ends in Xm" indicator) needs no backend
  change — it is already sitting in the same decoded payload.
