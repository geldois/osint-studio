"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL, login, loginAsVisitor, RateLimitError } from "@/lib/api";
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
    <main className="flex h-full flex-col items-center justify-center gap-6">
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

        <div className="min-h-5">
          {error && !isBlocked ? (
            <p className="text-sm text-red-500">{error.message}</p>
          ) : null}
          {isBlocked ? (
            <p className="text-sm text-amber-500">
              Limite de requisições atingido. Tente novamente em {retryAfterSeconds}s.
            </p>
          ) : null}
        </div>

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

        <a
          href={`${API_URL}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded border border-border px-3 py-2 text-center font-medium"
        >
          Ver documentação da API
        </a>
      </form>

      <footer className="flex items-center gap-4">
        <a
          href="https://github.com/geldois"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="text-muted hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            role="img"
            aria-hidden="true"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        </a>
        <a
          href="https://linkedin.com/in/geldois"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="text-muted hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            role="img"
            aria-hidden="true"
          >
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        </a>
      </footer>
    </main>
  );
}
