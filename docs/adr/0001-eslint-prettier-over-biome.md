# 1. ESLint (strictTypeChecked) + Prettier over Biome

## Status

Accepted

## Context

The project initially used Biome 2.x as the single linter/formatter. Biome 2.x
ships a type-aware project scanner that, in a pnpm workspace, follows imports into
`node_modules` `.d.ts` files to build a type-inference module graph. In the editor
(Zed) this scanner drove the language server into an unbounded indexing loop,
breaking format-on-save. The scanner could be disabled via `domains`, but doing so
removes exactly the type-aware rules (`noFloatingPromises`, unsafe-call/return/etc.)
that justify a strict linter — leaving Biome strictly weaker than the alternative
with no compensating benefit.

Three options were weighed: (a) Biome with the scanner disabled, (b) Oxlint + a
separate formatter, (c) ESLint + typescript-eslint + Prettier. Oxlint's formatter is
not production-ready and its rule set still trails ESLint/typescript-eslint. Biome
with the scanner off forfeits typed linting.

## Decision

Use ESLint 9 (flat config) with `typescript-eslint` `strictTypeChecked` +
`stylisticTypeChecked`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, and
`eslint-config-prettier/flat` (last, to cede all formatting authority to Prettier).
Prettier owns formatting via `.prettierrc` (88 cols, double quotes, semicolons,
trailing commas, LF). typescript-eslint reuses the TypeScript compiler via
`parserOptions.projectService`, so there is no second scanner and no daemon to wedge.

ESLint is pinned to `^9`, not `^10`: `eslint-plugin-react@7` declares a peer ceiling
of `^9.7`, and the React plugin ecosystem has not yet converged on ESLint 10.

## Consequences

- **Gained:** the strongest available rule coverage (typed linting the Biome-scanner-off
  path cannot provide); zero editor-hang; a portable setup with no platform-specific
  config, relying only on the portable `@biomejs/biome`-free toolchain.
- **Accepted cost:** JS-based linting is slower per file than Biome's Rust engine
  (~200ms vs ~50ms on this small codebase — negligible here); two config files
  (`eslint.config.mjs`, `.prettierrc`) instead of one `biome.json`; three dev
  dependencies where Biome was one.
- **Accepted opt-out:** `EntityNodeData` keeps `type` (not `interface`) against the
  `consistent-type-definitions` rule, because React Flow's `Node<T>` constrains T to
  `Record<string, unknown>`, which type aliases satisfy implicitly and interfaces do
  not. The opt-out is inline and documented at the declaration.
