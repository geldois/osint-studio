// Direct-run enforcement — `PreToolUse(Bash)`.
//
// `pre-commit` already runs the full gate (`scripts/run precommit`, itself
// fix-staged-then-`scripts/run check`) on every commit and reports any
// failure inline — every commit is born green by construction. Running the
// gate facade yourself (`scripts/run check`, `scripts/run precommit`,
// `pnpm run gates`, `pnpm run precommit`) or a bare full-project
// lint/format/type/build/test run is pure duplication of a guarantee
// `pre-commit` already gives; block those and redirect to just committing.
// A targeted single-file run stays allowed, for fast local feedback while
// writing code.

import { deny, readEvent, toolInput } from "./_hook-io";

// A Bash tool call is routinely a whole shell script (leading `cd`, chained
// `&&`/`;`/`|`, subshell parens), not one bare invocation — every check
// below must run per statement, never against the raw string's start, or a
// leading `cd studio && pnpm run lint` walks straight past every anchor.
const STATEMENT_SPLIT = /&&|[;\n]|\|+|[()]/;

// A heredoc body (a commit message passed via `<<'EOF' ... EOF`, the
// prescribed way to commit) is literal data, never a shell statement — but
// splitting on bare `(`/`)` above has no notion of that, so a conventional
// commit's own `(scope):` collides with a targetable name once split (e.g.
// `feat(lint): ...` yields the bare statement `lint`). Strip every heredoc
// down to its opening redirect before splitting, so its body and closing
// marker are never seen as statements at all.
const HEREDOC = /<<-?(['"]?)(\w+)\1\n[\s\S]*?\n\s*\2(?=\s|$)/g;

function stripHeredocs(command: string): string {
  return command.replace(HEREDOC, (_match, _quote, marker: string) => `<<${marker}`);
}

// Strip every leading runner/flag token (pnpm exec, pnpm run, npx, mise
// exec --, stray -q/--flags) so wrapping the call cannot bypass the match
// below.
const LEADING = /^(?:pnpm|npx|mise|exec|run|--?\S+)\s+/;

const FACADE_NAMES = new Set(["gates", "precommit"]);
// "run fix" is a fixer, not a verifier — safe and idempotent to run directly,
// so only "run check"/"run precommit" are blocked as facade duplication.
const FACADE_SCRIPT = /^scripts\/run\s+(?:check|precommit)\b/;

// tsc has no reliable single-file mode with full project (tsconfig)
// context, and `next build` only ever builds the whole app — both are
// always full-project, never a targeted run.
const FULL_ONLY_NAMES = new Set(["tsc", "type-check", "build"]);
const NEXT_BUILD = /^next\s+build\b/;

const TARGETABLE_NAMES = new Set([
  "eslint",
  "lint",
  "lint:fix",
  "prettier",
  "format",
  "vitest",
  "test",
  "test:watch",
]);
const TARGETED_FILE = /\s\S+\.(?:ts|tsx|js|jsx|mjs)(?:\s|$)/;
const TARGETED_FLAG = /(?:^|\s)(?:-t|--testNamePattern)\b/;

const REASON =
  "Don't self-verify — `pre-commit` already runs the full gate " +
  "(`scripts/run precommit`) on every commit and reports any failure " +
  "inline. Just commit: if it fails, fix what's reported and commit " +
  "again. Targeted single-file runs (e.g. `eslint path/to/file.ts`, " +
  "`vitest run path/to/file.test.ts`, `prettier --check path/to/file.ts`) " +
  "are still fine for quick iteration while writing code.";

function normalize(statement: string): string {
  let normalized = statement.trim();
  let match = LEADING.exec(normalized);
  while (match !== null) {
    normalized = normalized.slice(match[0].length);
    match = LEADING.exec(normalized);
  }
  return normalized;
}

function main(): void {
  const command = toolInput(readEvent(), "command");
  if (!command) {
    return;
  }

  for (const statement of stripHeredocs(command).split(STATEMENT_SPLIT)) {
    const normalized = normalize(statement);
    if (!normalized) {
      continue;
    }
    const head = normalized.split(/\s+/)[0] ?? "";

    if (FACADE_SCRIPT.test(normalized) || FACADE_NAMES.has(head)) {
      deny(REASON);
      return;
    }

    if (FULL_ONLY_NAMES.has(head) || NEXT_BUILD.test(normalized)) {
      deny(REASON);
      return;
    }

    if (!TARGETABLE_NAMES.has(head)) {
      continue;
    }
    if (TARGETED_FILE.test(normalized) || TARGETED_FLAG.test(normalized)) {
      continue;
    }

    deny(REASON);
    return;
  }
}

main();
