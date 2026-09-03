import { context, readEvent, toolInput } from "./_hook-io";

const STATEMENT_SPLIT = /&&|[;\n]|\|+|[()]/;

const HEREDOC = /<<-?(['"]?)(\w+)\1\n[\s\S]*?\n\s*\2(?=\s|$)/g;

function stripHeredocs(command: string): string {
  return command.replace(HEREDOC, (_match, _quote, marker: string) => `<<${marker}`);
}

const LEADING = /^(?:pnpm|npx|mise|exec|run|--?\S+)\s+/;

const FACADE_SCRIPT = /^scripts\/run\b/;
const NEXT_BUILD = /^next\s+build\b/;
const FLAGGED_NAMES = new Set([
  "gates",
  "verify",
  "precommit",
  "check",
  "fix",
  "eslint",
  "lint",
  "lint:fix",
  "prettier",
  "format",
  "tsc",
  "type-check",
  "build",
  "vitest",
  "test",
  "test:watch",
  "dprint",
  "shfmt",
  "shellcheck",
  "actionlint",
  "markdownlint-cli2",
]);

const REASON =
  "Never run a linter, formatter, type-checker, build, or test by hand — " +
  "not on one file, not on the whole repo. The git hook runs `scripts/run " +
  "precommit` (fix, then check) on the whole repo, automatically, on every " +
  "commit and merge attempt. Edit what needs editing and try to commit; " +
  "iterate on the gate's own failure output if it blocks.";

function normalize(statement: string): { normalized: string; stripped: boolean } {
  let normalized = statement.trim();
  let stripped = false;
  let match = LEADING.exec(normalized);
  while (match !== null) {
    normalized = normalized.slice(match[0].length);
    stripped = true;
    match = LEADING.exec(normalized);
  }
  return { normalized, stripped };
}

function main(): void {
  const command = toolInput(readEvent(), "command");
  if (!command) {
    return;
  }

  for (const statement of stripHeredocs(command).split(STATEMENT_SPLIT)) {
    const { normalized, stripped } = normalize(statement);
    if (!normalized) {
      continue;
    }
    const head = normalized.split(/\s+/)[0] ?? "";

    // "test" alone, with no package-manager prefix stripped, is the POSIX
    // test(1) builtin (`test -f x`), not the pnpm test script — only flag it
    // once a prefix (pnpm/npx/mise/exec/run) proves it was invoked as one.
    if (head === "test" && !stripped) {
      continue;
    }

    if (
      FACADE_SCRIPT.test(normalized) ||
      NEXT_BUILD.test(normalized) ||
      FLAGGED_NAMES.has(head)
    ) {
      context("PreToolUse", REASON);
      return;
    }
  }
}

main();
