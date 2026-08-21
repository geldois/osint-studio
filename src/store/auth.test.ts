import { beforeEach, describe, expect, it } from "vitest";
import { isExpired, useAuthStore } from "@/store/auth";

function makeToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

const NOW = 1_700_000_000_000;

describe("isExpired", () => {
  it("accepts a token whose exp is strictly in the future", () => {
    expect(isExpired(makeToken({ exp: NOW / 1000 + 60 }), NOW)).toBe(false);
  });

  it("rejects a token whose exp already passed", () => {
    expect(isExpired(makeToken({ exp: NOW / 1000 - 1 }), NOW)).toBe(true);
  });

  it("rejects a token expiring exactly now — the boundary is closed", () => {
    expect(isExpired(makeToken({ exp: NOW / 1000 }), NOW)).toBe(true);
  });

  it("accepts a token expiring one millisecond from now", () => {
    expect(isExpired(makeToken({ exp: (NOW + 1) / 1000 }), NOW)).toBe(false);
  });

  it.each([
    ["no exp claim", makeToken({ role: "ADMIN" })],
    ["a non-numeric exp", makeToken({ exp: "later" })],
    ["a null exp", makeToken({ exp: null })],
    ["no payload segment", "not-a-jwt"],
    ["an unparseable payload", "header.@@@@.signature"],
    ["an empty string", ""],
  ])("treats %s as expired", (_label, token) => {
    expect(isExpired(token, NOW)).toBe(true);
  });

  it("reads the clock when no explicit now is given", () => {
    expect(isExpired(makeToken({ exp: Date.now() / 1000 + 3600 }))).toBe(false);
    expect(isExpired(makeToken({ exp: Date.now() / 1000 - 3600 }))).toBe(true);
  });
});

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearToken();
  });

  it.each([
    ["ADMIN", "ADMIN"],
    ["VIEWER", "VIEWER"],
  ])("derives role %s off the token claim", (claim, expected) => {
    useAuthStore.getState().setToken(makeToken({ role: claim }));
    expect(useAuthStore.getState().role).toBe(expected);
  });

  it.each([
    ["an unknown role", makeToken({ role: "SUPERUSER" })],
    ["no role claim", makeToken({ exp: 1 })],
    ["an unparseable payload", "header.@@@@.signature"],
  ])("leaves role null for %s", (_label, token) => {
    useAuthStore.getState().setToken(token);
    expect(useAuthStore.getState().role).toBeNull();
  });

  it("keeps the token verbatim, never a re-encoded copy", () => {
    const token = makeToken({ role: "ADMIN", exp: 1 });
    useAuthStore.getState().setToken(token);
    expect(useAuthStore.getState().token).toBe(token);
  });

  it("drops both token and role on logout", () => {
    useAuthStore.getState().setToken(makeToken({ role: "ADMIN" }));
    useAuthStore.getState().clearToken();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().role).toBeNull();
  });
});
