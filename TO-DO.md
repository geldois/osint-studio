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

- Radial layout math (`layoutGraph`/`separateOverlaps` in `graph-adapter.ts`) has no
  coverage — async and ELK-backed, deferred per `docs/architecture/tooling.md`.
  `extractLabel`, `edgeKey`, and `mergeGraph` are now covered.
- No test in the commit gate exercises a real osint-engine response. The five contract
  breaks fixed in `mvp-temporal-navigation/0-reconnect-frontend-contract` were all
  invisible to the unit suite, because every mock was written against the same wrong
  assumption the code held. Only a request against a running backend catches that class of
  drift, and it can't join the gate without a live server. Run it by hand after any change
  to `api-schemas.ts`: ingest one `.txt` and one `.csv`, and parse both responses plus
  `GET /text-ingestion/patterns` through the frontend's own schemas.
