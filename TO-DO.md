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

## refactor(ui)

- `src/components/detail-panel/detail-panel.tsx` e `src/components/data-table/*` ainda usam Tailwind manual, fora
  do escopo da primeira leva de adoção do shadcn/ui (ver
  `~/+ME/brain/notes/specs/osint-studio/adopt-shadcn-ui-component-kit.md`). Primitivos já disponíveis em
  `src/components/ui/`; falta mapear `Table`/`Card`/`ScrollArea` pra essas duas telas.

## refactor(whiteboard)

- Radial placement fans new nodes around the anchor at a fixed radius; dense groups or
  repeated expansions can overlap existing nodes. Revisit with a force-directed or
  collision-aware pass if graphs grow large.

## test(studio)

- Radial layout math (`layoutGraph`/`separateOverlaps` in `graph-adapter.ts`) has no
  coverage — async and ELK-backed, deferred per `docs/architecture/tooling.md`.
  `extractLabel`, `edgeKey`, and `mergeGraph` are now covered.
