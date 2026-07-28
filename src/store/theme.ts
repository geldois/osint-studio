import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "osint-studio:theme";
const DEFAULT_THEME: Theme = "dark";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
}

function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: DEFAULT_THEME,
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    applyThemeClass(next);
    set({ theme: next });
  },
}));

/** Reads the persisted theme and syncs the store + DOM class on mount.
 * Kept separate from store creation because it touches `document`, which
 * doesn't exist during SSR module evaluation. */
export function hydrateThemeStore(): void {
  const theme = readStoredTheme();
  applyThemeClass(theme);
  useThemeStore.setState({ theme });
}
