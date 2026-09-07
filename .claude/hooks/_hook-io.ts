import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const GENERATED_PREFIXES = [
  "node_modules/",
  ".next/",
  ".cache/",
  "build/",
  "coverage/",
];

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

export interface RepoRelative {
  path: string;
  root: string;
  rel: string;
}

export function repoRelative(file: string): RepoRelative | null {
  const path = isAbsolute(file) ? file : resolve(process.cwd(), file);
  const root = gitRoot(path);
  if (root === null || !path.startsWith(root + sep)) {
    return null;
  }
  return { path, root, rel: relative(root, path).split(sep).join("/") };
}

export function gitRoot(start: string): string | null {
  const projectDir = process.env["CLAUDE_PROJECT_DIR"];
  if (projectDir !== undefined && projectDir !== "") {
    return projectDir;
  }
  const cwd =
    existsSync(start) && statSync(start).isDirectory() ? start : dirname(start);
  const result = run(["git", "rev-parse", "--show-toplevel"], cwd);
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

export function sessionId(event: JsonRecord): string {
  const value = event["session_id"];
  return typeof value === "string" ? value : "";
}

const MARKER_STALE_MS = 12 * 60 * 60 * 1000;

export function setMarker(prefix: string, session: string, value = ""): void {
  if (!session) {
    return;
  }
  try {
    const directory = markerDir();
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const safePrefix = safe(prefix);
    sweepStaleMarkers(directory, safePrefix);
    writeFileSync(join(directory, `${safePrefix}-${safe(session)}`), value);
  } catch {
    return;
  }
}

export function takeMarker(prefix: string, session: string): boolean {
  if (!session) {
    return false;
  }
  try {
    unlinkSync(join(markerDir(), `${safe(prefix)}-${safe(session)}`));
    return true;
  } catch {
    return false;
  }
}

export function markerValue(prefix: string, session: string): string | null {
  if (!session) {
    return null;
  }
  try {
    return readFileSync(join(markerDir(), `${safe(prefix)}-${safe(session)}`), "utf-8");
  } catch {
    return null;
  }
}

export function markerDir(): string {
  return join(tmpdir(), "osint-studio-claude-hooks");
}

function safe(prefix: string): string {
  return prefix.replace(/[^A-Za-z0-9_-]/g, "_");
}

function sweepStaleMarkers(directory: string, prefix: string): void {
  const cutoff = Date.now() - MARKER_STALE_MS;
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return;
  }
  for (const name of entries) {
    if (!name.startsWith(`${prefix}-`)) {
      continue;
    }
    const path = join(directory, name);
    try {
      if (statSync(path).mtimeMs < cutoff) {
        unlinkSync(path);
      }
    } catch {
      continue;
    }
  }
}

export function stopReinvoked(event: JsonRecord): boolean {
  return (
    (event["hook_event_name"] === "Stop" ||
      event["hook_event_name"] === "SubagentStop") &&
    event["stop_hook_active"] === true
  );
}

export function context(
  hookEventName: string,
  text: string,
  oncePerChain = true,
): void {
  if (oncePerChain && stopReinvoked(readEvent())) {
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
