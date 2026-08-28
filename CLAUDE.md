# osint-studio

Only what no other source holds. Everything else is owned elsewhere — go there, never restate it here.

| Question                          | Source                   |
| --------------------------------- | ------------------------ |
| What a domain term means          | `CONTEXT.md`             |
| Why a technical decision was made | `docs/architecture/*.md` |
| Setup, run, routes, stack         | `README.md`              |
| Known deferrals, accepted debt    | `TO-DO.md`               |

## Gates

`scripts/run check|fix|verify [files...]` are the only entry points into every linter, formatter, and check the
repo owns.

- `scripts/run fix` runs every safe fixer (prettier, eslint --fix, dprint fmt, shfmt -w, markdownlint --fix) on the
  given files, or the whole repo with none given. `.claude/hooks/after-turn.ts` calls it on every turn's changed
  files, silently.
- `scripts/run check` runs every lint/type/build/test gate, `--max-warnings 0` included. `.githooks/pre-commit` and
  `.githooks/pre-merge-commit` both call it directly, blocking, silent when green. Last run's full record:
  `build/reports/gates.json` (gitignored).
- `scripts/run verify [files...]` runs fix then check, for a human's own manual use: one line, `verify: ok`, when
  green; the full failing output when not. `.claude/hooks/block-direct-checks.ts` denies the assistant from ever
  running `check`/`fix`/`verify`/`gates` itself, even to pre-check before a commit — it attempts the commit or
  merge directly and reacts to the gate's own failure output if it blocks. Targeted single-file runs (e.g.
  `eslint path/to/file.ts`) stay allowed for quick iteration while writing code.

Activate the git hooks once per clone — `git config --local include.path ../.gitconfig` — or every commit lands
unchecked. Needs `mise` active on `PATH`.

For a batch of several commits in one session, `--no-verify` each one and run `scripts/run check` once before
ending the session or pushing.

## Code

No comments and no docstrings anywhere in this repository, ever — not `src/`, not `.claude/hooks/`, `.github/`, nor
any root-level config — the name says it, or the code is wrong, or the decision belongs in `README.md`/`TO-DO.md`/
`docs/architecture/*.md`/this file/`CONTEXT.md`. Nothing strips one automatically: writing it is the mistake, not
leaving it in the file. `.claude/hooks/report-comments.ts` nudges on any one introduced this turn, or already
sitting in a file just read, outside an allowlisted linter-suppression pragma (`eslint-disable`/`@ts-expect-error`
and similar).
