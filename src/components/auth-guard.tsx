"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && token === null) {
      router.replace("/login");
    }
  }, [hasHydrated, token, router]);

  if (!hasHydrated || token === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="size-8 rounded-full" />
      </div>
    );
  }

  return children;
}
