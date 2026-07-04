# 3. semantic-release for automated releases

## Status

Accepted

## Context

The sibling project osint-engine automates releases with `python-semantic-release`
via a manual `workflow_dispatch` ("Release" button): it parses Conventional Commits,
computes the next SemVer, updates the version and changelog, tags, and publishes a
GitHub release. This project needs the same behavior and the same manual-trigger UX.

Two options were weighed. A hand-rolled, dependency-free Node script would parse
commits and bump the version with zero added packages — appealing for leanness, but
it would reimplement edge cases (squash commits, reverts, breaking-change footers,
notes generation) that a mature tool has hardened over years. The alternative,
`semantic-release`, is free and open-source (MIT); it pulls a large plugin tree but
is CI-only and battle-tested.

## Decision

Use `semantic-release` (v25) driven by a `workflow_dispatch` workflow that mirrors
osint-engine's (concurrency group, pinned actions, manual trigger). The toolchain is
provisioned in CI by `jdx/mise-action`, reading the same `.mise.toml` as local dev —
one source of truth for Node and pnpm versions.

Configuration (`.releaserc.json`) mirrors osint-engine's policy exactly via the
`conventionalcommits` preset plus one release rule: `feat` → minor; `fix`/`perf`/
`refactor` → patch; `type!:` or a `BREAKING CHANGE:` footer → major; tag format
`v{version}`; release branch `main`, no prerelease. Plugins: commit-analyzer,
release-notes-generator, changelog, npm (with `npmPublish: false` — this is a private
app, so the plugin only bumps the version), git (commits `package.json` + `CHANGELOG.md`
with a `[skip ci]` message), and github (creates the release).

Every plugin referenced in the config — including the ones bundled with the core — is
declared as a direct devDependency, because pnpm's strict linker does not hoist
transitive packages to the top level; referencing an undeclared bundled plugin by name
would fail to resolve.

## Consequences

- **Gained:** hardened handling of release edge cases from a widely-used tool; identical
  trigger UX and versioning policy to osint-engine; CI toolchain that matches local dev
  through `.mise.toml`; a local `--dry-run --no-ci` preview.
- **Accepted cost:** a large CI-only dependency tree (semantic-release + plugins). Judged
  acceptable because it never ships to users — it runs only in the release job — and buys
  correctness the hand-rolled script could not guarantee.
- **Accepted cost:** all configured plugins must be kept as explicit devDependencies for
  pnpm resolution; adding a plugin to `.releaserc.json` means also adding it to
  `package.json`.
