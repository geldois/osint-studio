import { create } from "zustand";

export type Role = "ADMIN" | "VIEWER";

interface AuthStore {
  token: string | null;
  role: Role | null;
  setToken: (t: string) => void;
  clearToken: () => void;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

/** Reads the role claim off the JWT for display purposes only — the
 * signature isn't validated client-side, the backend is the source of
 * truth for every authorization decision. */
function decodeRole(token: string): Role | null {
  const payload = token.split(".")[1];
  if (payload === undefined) {
    return null;
  }
  try {
    const claims = JSON.parse(base64UrlDecode(payload)) as { role?: unknown };
    return claims.role === "ADMIN" || claims.role === "VIEWER" ? claims.role : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  role: null,
  setToken: (token) => {
    set({ token, role: decodeRole(token) });
  },
  clearToken: () => {
    set({ token: null, role: null });
  },
}));
