import { deny, readEvent, toolInput } from "./_hook-io";

const STATEMENT_SPLIT = /&&|[;\n]|\|+|[()]/;

const HEREDOC = /<<-?(['"]?)(\w+)\1\n[\s\S]*?\n\s*\2(?=\s|$)/g;

function stripHeredocs(command: string): string {
  return command.replace(HEREDOC, (_match, _quote, marker: string) => `<<${marker}`);
}

const LEADING = /^(?:pnpm|npx|mise|exec|run|--?\S+)\s+/;

const FACADE_NAMES = new Set(["gates"]);
const FACADE_SCRIPT = /^scripts\/run\s+(?:check|fix)\b/;

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
  "Denied — the only sanctioned way to run checks or fixes yourself is " +
  "`scripts/run verify [files...]` (fix, then check, on the given files or " +
  "the whole repo with none given). Fix already runs silently every turn " +
  "and check already runs at commit/merge; use `verify` only when you need " +
  "the result before either of those would. Targeted single-file runs " +
  "(e.g. `eslint path/to/file.ts`, `vitest run path/to/file.test.ts`, " +
  "`prettier --check path/to/file.ts`) are still fine for quick iteration " +
  "while writing code.";

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
