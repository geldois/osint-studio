import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

export type JsonRecord = Record<string, unknown>;

let eventCache: JsonRecord | null = null;

export function readEvent(): JsonRecord {
  if (eventCache !== null) {
    return eventCache;
  }
  try {
    const raw: unknown = JSON.parse(readFileSync(0, "utf-8"));
    eventCache = typeof raw === "object" && raw !== null ? (raw as JsonRecord) : {};
  } catch {
    eventCache = {};
  }
  return eventCache;
}

export function toolInput(event: JsonRecord, key: string): string {
  const raw = event["tool_input"];
  if (typeof raw !== "object" || raw === null) {
    return "";
  }
  const value = (raw as JsonRecord)[key];
  return typeof value === "string" ? value : "";
}

export function toolName(event: JsonRecord): string {
  const value = event["tool_name"];
  return typeof value === "string" ? value : "";
}

export function toolResponse(event: JsonRecord): JsonRecord {
  const raw = event["tool_response"];
  return typeof raw === "object" && raw !== null ? (raw as JsonRecord) : {};
}

export interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

export function run(command: string[], cwd?: string): RunResult | null {
  const [executable, ...args] = command;
  if (executable === undefined) {
    return null;
  }
  const result = spawnSync(executable, args, { cwd, encoding: "utf-8" });
  if (result.error) {
    return null;
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function gitRoot(start: string): string | null {
  const projectDir = process.env["CLAUDE_PROJECT_DIR"];
  if (projectDir !== undefined && projectDir !== "") {
    return projectDir;
  }
  const result = run(["git", "rev-parse", "--show-toplevel"], start);
  if (result?.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

export function deny(reason: string): void {
  emit({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  });
}

export function addContext(text: string): void {
  emit({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: text,
    },
  });
}

export function context(
  hookEventName: string,
  text: string,
  oncePerChain = true,
): void {
  if (
    oncePerChain &&
    (hookEventName === "Stop" || hookEventName === "SubagentStop") &&
    readEvent()["stop_hook_active"] === true
  ) {
    return;
  }
  emit({
    hookSpecificOutput: {
      hookEventName,
      additionalContext: text,
    },
  });
}

function emit(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}
