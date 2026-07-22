# OSINT Studio

[![Release](https://img.shields.io/github/v/release/geldois/osint-studio)](https://github.com/geldois/osint-studio/releases)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/next.js-16-black)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Graph explorer front-end for [osint-engine](https://github.com/geldois/osint-engine).

**Live:** [osint.angelitochagas.com](https://osint.angelitochagas.com)

## Stack

- **Runtime:** Node.js 22+ LTS
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19 (TypeScript strict)
- **Graph canvas:** @xyflow/react
- **State:** Zustand
- **Server state:** TanStack Query
- **Styling:** Tailwind CSS v4.1+
- **Theme:** next-themes
- **Linting:** ESLint 9 + typescript-eslint (`strictTypeChecked`)
- **Formatting:** Prettier

## Setup

```bash
mise install  # pins Node LTS + pnpm
pnpm install
pnpm dev
```

## Routes

| Path | Screen |
| --- | --- |
| `/login` | Auth |
| `/whiteboard` | Graph canvas |

## Environment

```http
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Release

Releases are triggered manually from the **Release** workflow (`Actions → Release → Run workflow` on `main`).
It runs [semantic-release](https://semantic-release.gitbook.io): Conventional Commits since the last tag determine the
next SemVer; it updates `package.json` + `CHANGELOG.md`, tags, and publishes a GitHub release.

| Commit type | Bump |
| --- | --- |
| `feat` | minor |
| `fix`, `perf`, `refactor` | patch |
| `type!:` / `BREAKING CHANGE` | major |

Preview the next release locally (no changes are made):

```bash
GITHUB_TOKEN=<token> pnpm exec semantic-release --dry-run --no-ci
```
