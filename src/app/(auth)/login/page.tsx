"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const setToken = useAuthStore((s) => s.setToken);
  const router = useRouter();

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (res) => {
      setToken(res.access_token);
      router.push("/whiteboard");
    },
  });

  return (
    <main className="flex h-full items-center justify-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate();
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

        {error ? <p className="text-sm text-red-500">{error.message}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-white px-3 py-2 font-medium text-black disabled:opacity-50"
        >
          {isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
