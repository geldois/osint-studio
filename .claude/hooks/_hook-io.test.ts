import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  gitRoot,
  markerDir,
  markerValue,
  repoRelative,
  sessionId,
  setMarker,
  takeMarker,
} from "./_hook-io";

describe("setMarker / takeMarker", () => {
  it("round-trips a marker for one session", () => {
    const session = randomUUID();
    setMarker("test-prefix", session);
    expect(takeMarker("test-prefix", session)).toBe(true);
  });

  it("is single-use: a second take returns false", () => {
    const session = randomUUID();
    setMarker("test-prefix", session);
    expect(takeMarker("test-prefix", session)).toBe(true);
    expect(takeMarker("test-prefix", session)).toBe(false);
  });

  it("returns false for a marker that was never set", () => {
    expect(takeMarker("test-prefix", randomUUID())).toBe(false);
  });

  it("is a no-op when session is empty", () => {
    setMarker("test-prefix", "");
    expect(takeMarker("test-prefix", "")).toBe(false);
  });

  it("returns false immediately when session is empty", () => {
    expect(takeMarker("test-prefix", "")).toBe(false);
  });

  it("scopes markers per session", () => {
    const a = randomUUID();
    const b = randomUUID();
    setMarker("test-prefix", a);
    expect(takeMarker("test-prefix", b)).toBe(false);
    expect(takeMarker("test-prefix", a)).toBe(true);
  });

  it("sweeps a stale marker of the same prefix on the next set", () => {
    const prefix = `sweep-${randomUUID()}`;
    const staleSession = randomUUID();
    const freshSession = randomUUID();

    setMarker(prefix, staleSession);
    const dir = markerDir();
    mkdirSync(dir, { recursive: true });
    const stalePath = join(dir, `${prefix}-${staleSession}`);
    const old = new Date(Date.now() - 13 * 60 * 60 * 1000);
    utimesSync(stalePath, old, old);

    setMarker(prefix, freshSession);

    expect(existsSync(stalePath)).toBe(false);
    expect(takeMarker(prefix, freshSession)).toBe(true);
  });

  it("leaves a fresh marker of the same prefix alone", () => {
    const prefix = `sweep-${randomUUID()}`;
    const sessionA = randomUUID();
    const sessionB = randomUUID();

    setMarker(prefix, sessionA);
    setMarker(prefix, sessionB);

    expect(takeMarker(prefix, sessionA)).toBe(true);
    expect(takeMarker(prefix, sessionB)).toBe(true);
  });

  it("costs exactly one nudge no matter how many times it is set in one turn", () => {
    const session = randomUUID();
    setMarker("test-prefix", session);
    setMarker("test-prefix", session);
    setMarker("test-prefix", session);
    expect(takeMarker("test-prefix", session)).toBe(true);
    expect(takeMarker("test-prefix", session)).toBe(false);
  });

  it("sanitizes a session value that could otherwise escape the marker directory", () => {
    const dangerous = "../../etc/passwd";
    setMarker("test-prefix", dangerous);
    const prefix = "test-prefix-";
    const entries = readdirSync(markerDir()).filter((name) => name.startsWith(prefix));
    expect(entries).toEqual([`${prefix}${dangerous.replace(/[^A-Za-z0-9_-]/g, "_")}`]);
    expect(takeMarker("test-prefix", dangerous)).toBe(true);
  });
});

describe("markerValue", () => {
  it("returns the stored value without consuming the marker", () => {
    const session = randomUUID();
    setMarker("test-prefix", session, "hello");
    expect(markerValue("test-prefix", session)).toBe("hello");
    expect(takeMarker("test-prefix", session)).toBe(true);
  });

  it("returns null when unset", () => {
    expect(markerValue("test-prefix", randomUUID())).toBeNull();
  });

  it("returns null when session is empty", () => {
    expect(markerValue("test-prefix", "")).toBeNull();
  });
});

describe("sessionId", () => {
  it("reads a string session_id field", () => {
    expect(sessionId({ session_id: "abc123" })).toBe("abc123");
  });

  it("returns empty string when missing or the wrong type", () => {
    expect(sessionId({})).toBe("");
    expect(sessionId({ session_id: 42 })).toBe("");
  });
});

describe("repoRelative", () => {
  it("resolves an absolute path under the repo root", () => {
    const target = repoRelative(join(process.cwd(), "package.json"));
    expect(target?.rel).toBe("package.json");
  });

  it("resolves a relative path against the current working directory", () => {
    const target = repoRelative("package.json");
    expect(target?.rel).toBe("package.json");
  });

  it("returns null for a path outside any git repo", () => {
    expect(repoRelative("/nonexistent-root-marker/some/file.ts")).toBeNull();
  });
});

describe("gitRoot without CLAUDE_PROJECT_DIR", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves a file path by falling back to its own directory, not itself, as cwd", () => {
    vi.stubEnv("CLAUDE_PROJECT_DIR", "");
    const root = gitRoot(join(process.cwd(), "package.json"));
    expect(root).toBe(process.cwd());
  });

  it("still resolves repoRelative for a real file with no CLAUDE_PROJECT_DIR set", () => {
    vi.stubEnv("CLAUDE_PROJECT_DIR", "");
    const target = repoRelative(join(process.cwd(), "package.json"));
    expect(target?.rel).toBe("package.json");
  });
});
