import { existsSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { addContext, gitRoot, readEvent, run, toolInput } from "./_hook-io";

const ESLINT = ["pnpm", "exec", "eslint", "--format", "json"];
const LINTABLE_SUFFIXES = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const MAX_REPORTED = 20;

interface EslintMessage {
  line?: number;
  ruleId?: string | null;
  message?: string;
  fix?: unknown;
}

interface EslintFileResult {
  messages?: EslintMessage[];
}

function main(): void {
  const file = toolInput(readEvent(), "file_path");
  if (!file) {
    return;
  }

  const path = isAbsolute(file) ? file : resolve(process.cwd(), file);
  const suffix = path.slice(path.lastIndexOf("."));
  if (!LINTABLE_SUFFIXES.has(suffix) || !existsSync(path) || !statSync(path).isFile()) {
    return;
  }

  const root = gitRoot(path);
  if (root === null || !path.startsWith(root + sep)) {
    return;
  }

  const violations = irreducible(path, root);
  if (violations === null) {
    return;
  }
  if (violations.length > 0) {
    addContext(["── eslint (not auto-fixable) ──", ...violations].join("\n"));
  } else {
    addContext(`linting: ok (${relative(root, path)})`);
  }
}

function irreducible(path: string, root: string): string[] | null {
  const result = run([...ESLINT, path], root);
  if (result === null) {
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(result.stdout);
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const fileResult = raw[0] as EslintFileResult | undefined;
  const messages = fileResult?.messages;
  if (!Array.isArray(messages)) {
    return null;
  }

  const reported: string[] = [];
  for (const message of messages) {
    if (message.fix !== undefined) {
      continue;
    }
    reported.push(format(message));
    if (reported.length === MAX_REPORTED) {
      break;
    }
  }
  return reported;
}

function format(message: EslintMessage): string {
  const ruleId = typeof message.ruleId === "string" ? message.ruleId : "?";
  const line = message.line === undefined ? "?" : String(message.line);
  return `  ${line}: ${ruleId} ${message.message ?? ""}`;
}

main();
