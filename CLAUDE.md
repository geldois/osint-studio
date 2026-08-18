# osint-studio

Only what no other source holds. Everything else is owned elsewhere — go there, never restate it here.

| Question                          | Source                   |
| --------------------------------- | ------------------------ |
| What a domain term means          | `CONTEXT.md`             |
| Why a technical decision was made | `docs/architecture/*.md` |
| Setup, run, routes, stack         | `README.md`              |
| Known deferrals, accepted debt    | `TO-DO.md`               |

## Gates

`scripts/run check|fix|precommit`. `.claude/hooks/block-direct-checks.ts` blocks a direct `check`/`precommit` run
and redirects to committing — targeted single-file runs and `scripts/run fix` stay allowed. Last run's full record:
`build/reports/gates.json` (gitignored).

Activate the git hooks once per clone — `git config --local include.path ../.gitconfig` — or every commit lands
unchecked. Needs `mise` active on `PATH`.

## Code

No comments in `src/` — the name says it, or the code is wrong. `precommit` strips any new one from the lines an
edit actually touched (pragmas like `eslint-disable`/`@ts-expect-error` survive); a pre-existing comment is left
alone until its own line is next edited.
