# osint-studio

Only what no other source holds. Everything else is owned elsewhere — go there, never restate it here.

| Question                          | Source                   |
| --------------------------------- | ------------------------ |
| What a domain term means          | `CONTEXT.md`             |
| Why a technical decision was made | `docs/architecture/*.md` |
| Setup, run, routes, stack         | `README.md`              |
| Known deferrals, accepted debt    | `TO-DO.md`               |

## Gates

Never run a linter, formatter, type-checker, build, or test yourself — not on one file, not on the whole repo.
Edit what needs editing and attempt the commit or merge directly; the git hook runs everything on the whole repo
automatically and blocks it if something's wrong. Iterate from the gate's own failure output, never from a manual
run. See README.md's Quality gates section for what the git hook actually runs and how a human runs it manually.

Activate the git hooks once per clone — `git config --local include.path ../.gitconfig` — or every commit lands
unchecked. Needs `mise` active on `PATH`.

## Code

No comments and no docstrings anywhere in this repository, ever — not `src/`, not `.claude/hooks/`, `.github/`, nor
any root-level config — the name says it, or the code is wrong, or the decision belongs in `README.md`/`TO-DO.md`/
`docs/architecture/*.md`/this file/`CONTEXT.md`. Nothing strips one automatically: writing it is the mistake, not
leaving it in the file. `.claude/hooks/report-comments.ts` nudges on any one introduced this turn, or already
sitting in a file just read, outside an allowlisted linter-suppression pragma (`eslint-disable`/`@ts-expect-error`
and similar).
