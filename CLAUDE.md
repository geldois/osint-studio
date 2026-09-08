# osint-studio

Only what no other source holds. Everything else is owned elsewhere — go there, never restate it here.

| Question                          | Source                   |
| --------------------------------- | ------------------------ |
| What a domain term means          | `CONTEXT.md`             |
| Why a technical decision was made | `docs/architecture/*.md` |
| Setup, run, routes, stack         | `README.md`              |
| Known deferrals, accepted debt    | `TO-DO.md`               |

## Gates

Never run a linter, formatter, type-checker, build, or test yourself — not on one file, not on the whole repo. Edit what
needs editing and attempt the commit or merge directly; the git hook runs everything on the whole repo automatically and
blocks it if something's wrong. Iterate from the gate's own failure output, never from a manual run. See README.md's
Quality gates section for what the git hook actually runs and how a human runs it manually.

Activate the git hooks once per clone — `git config --local include.path ../.gitconfig` — or every commit lands
unchecked. Needs `mise` active on `PATH`.

## Frontend

Before writing any visual, dashboard, chart, or table element, check `docs/architecture/ui.md` and `src/components/ui/`,
`src/components/dashboard/`, `src/components/data-table/` for a primitive that already covers it, and reuse or extend
it. Never hand-roll a parallel one for something reusable/centralizable — one source of truth per component class,
visual coherence across the app, is non-negotiable.

This is absolute, not a style preference: no color, border, radius, spacing, or active/hover/focus state is ever
declared locally when a token or primitive already owns it — fix it in the primitive (`ui/toggle.tsx`, `ui/button.tsx`)
so every caller inherits it, never patch one caller and leave the rest to drift. Two components solving the same UX
problem (a confirmation, a version picker, a card) in two different ways is the same violation as duplicated code —
merge them into one before adding a third.

## Code

No comments and no docstrings anywhere in this repository, ever — not `src/`, not `.claude/hooks/`, `.github/`, nor any
root-level config — the name says it, or the code is wrong, or the decision belongs in `README.md`/`TO-DO.md`/
`docs/architecture/*.md`/this file/`CONTEXT.md`. Nothing strips one automatically: writing it is the mistake, not
leaving it in the file. `.claude/hooks/report-comments.ts` nudges on any one introduced this turn, or already sitting in
a file just read, outside an allowlisted linter-suppression pragma (`eslint-disable`/`@ts-expect-error` and similar).
