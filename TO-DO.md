# TO-DO

## chore(deploy)

- `NEXT_PUBLIC_API_URL` is only ever set for local dev (defaults to `http://localhost:8000`); no Vercel deployment
  exists yet. When it does, the production value and the backend's `CORS_ORIGINS` need to be configured together —
  neither works without the other.

## feat(auth)

- Token lives only in memory (Zustand, no `persist`); a page refresh drops it and
  forces re-login. Deferred: `sessionStorage` persistence via Zustand middleware with
  hydration guard to avoid SSR flash.

## fix(api)

- Error path assumes JSON: on a non-ok response the body is parsed as `{ detail }`,
  which throws an opaque parse error for non-JSON failures (proxy 502, HTML). Read
  text first, then attempt to parse.

## refactor(whiteboard)

- Radial placement fans new nodes around the anchor at a fixed radius; dense groups or
  repeated expansions can overlap existing nodes. Revisit with a force-directed or
  collision-aware pass if graphs grow large.

## test(studio)

- No tests yet: `extractLabel`, `radialPosition`, `edgeKey`, and `mergeGraph`
  (idempotency: re-expanding an existing node must add no duplicate nodes/edges) are
  pure and the highest-value units to cover.

## validation(api)

- API responses are cast to their types without runtime validation. Introduce schema
  parsing (e.g. Zod) at the `login`/`fetchGraph` boundary so backend drift fails at the
  edge instead of at render.
