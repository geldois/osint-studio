"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { login, loginAsVisitor, RateLimitError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const setToken = useAuthStore((s) => s.setToken);
  const router = useRouter();

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [retryAfterSeconds]);

  const handleError = (error: Error) => {
    if (error instanceof RateLimitError) {
      setRetryAfterSeconds(Math.ceil(error.retryAfterSeconds));
    }
  };

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (res) => {
      setToken(res.access_token);
      router.push("/whiteboard");
    },
    onError: handleError,
  });

  const visitorMutation = useMutation({
    mutationFn: loginAsVisitor,
    onSuccess: (res) => {
      setToken(res.access_token);
      router.push("/whiteboard");
    },
    onError: handleError,
  });

  const isBlocked = retryAfterSeconds > 0;
  const isPending = loginMutation.isPending || visitorMutation.isPending;
  const error = loginMutation.error ?? visitorMutation.error;

  return (
    <main className="flex h-full items-center justify-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation.mutate();
        }}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-6"
      >
        <h1 className="text-lg font-semibold">OSINT Studio</h1>

        <input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          placeholder="Usuário"
          autoComplete="username"
          className="w-full rounded border border-border bg-background px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          placeholder="Senha"
          autoComplete="current-password"
          className="w-full rounded border border-border bg-background px-3 py-2"
        />

        {error && !isBlocked ? (
          <p className="text-sm text-red-500">{error.message}</p>
        ) : null}
        {isBlocked ? (
          <p className="text-sm text-amber-500">
            Limite de requisições atingido. Tente novamente em {retryAfterSeconds}s.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || isBlocked}
          className="w-full rounded bg-white px-3 py-2 font-medium text-black disabled:opacity-50"
        >
          {loginMutation.isPending ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => {
            visitorMutation.mutate();
          }}
          disabled={isPending || isBlocked}
          className="w-full rounded border border-border px-3 py-2 font-medium disabled:opacity-50"
        >
          {visitorMutation.isPending ? "Entrando..." : "Entrar como visitante"}
        </button>
      </form>
    </main>
  );
}
