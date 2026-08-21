import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Role = "ADMIN" | "VIEWER";

interface AuthStore {
  token: string | null;
  role: Role | null;
  hasHydrated: boolean;
  setToken: (t: string) => void;
  clearToken: () => void;
  setHasHydrated: () => void;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function decodeClaims(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (payload === undefined) {
    return null;
  }
  try {
    const claims: unknown = JSON.parse(base64UrlDecode(payload));
    return typeof claims === "object" && claims !== null
      ? (claims as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function decodeUnverifiedRoleForDisplay(token: string): Role | null {
  const role = decodeClaims(token)?.["role"];
  return role === "ADMIN" || role === "VIEWER" ? role : null;
}

export function isExpired(token: string, now: number = Date.now()): boolean {
  const exp = decodeClaims(token)?.["exp"];
  return typeof exp !== "number" || exp * 1000 <= now;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      hasHydrated: false,
      setToken: (token) => {
        set({ token, role: decodeUnverifiedRoleForDisplay(token) });
      },
      clearToken: () => {
        set({ token: null, role: null });
      },
      setHasHydrated: () => {
        set({ hasHydrated: true });
      },
    }),
    {
      name: "osint-studio-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state, error) => {
        if (state === undefined || error !== undefined) {
          return;
        }
        if (state.token !== null) {
          if (isExpired(state.token)) {
            state.clearToken();
          } else {
            state.setToken(state.token);
          }
        }
        state.setHasHydrated();
      },
    },
  ),
);
