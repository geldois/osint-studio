"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { hydrateThemeStore } from "@/store/theme";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    hydrateThemeStore();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
