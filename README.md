# OSINT Studio

[![Node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/next.js-16-black)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Graph explorer front-end for [osint-engine](https://github.com/geldois/osint-engine).

## Stack

- **Runtime:** Node.js 22+ LTS
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19 (TypeScript strict)
- **Graph canvas:** @xyflow/react
- **State:** Zustand
- **Server state:** TanStack Query
- **Styling:** Tailwind CSS v4.1+
- **Theme:** next-themes
- **Linting/Formatting:** Biome

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
