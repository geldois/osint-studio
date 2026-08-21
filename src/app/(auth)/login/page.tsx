"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL, login, loginAsVisitor, RateLimitError } from "@/lib/api";
import { translateError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const loginSchema = z.object({
  username: z.string().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const setToken = useAuthStore((s) => s.setToken);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (hasHydrated && token !== null) {
      router.replace("/whiteboard");
    }
  }, [hasHydrated, token, router]);

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
    mutationFn: (values: LoginFormValues) => login(values.username, values.password),
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
      <Card className="w-full max-w-sm">
        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSubmit((values) => {
                loginMutation.mutate(values);
              })(e);
            }}
            className="space-y-4"
          >
            <h1 className="text-lg font-semibold">OSINT Studio</h1>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="sr-only">
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Usuário"
                autoComplete="username"
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                {...register("username")}
              />
              {errors.username ? (
                <p className="text-red-500 text-xs">{errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="sr-only">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha"
                autoComplete="current-password"
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-red-500 text-xs">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="min-h-5">
              {error && !isBlocked ? (
                <p className="text-sm text-red-500">{translateError(error)}</p>
              ) : null}
              {isBlocked ? (
                <p className="text-sm text-amber-500">
                  Limite atingido. Tente novamente em {retryAfterSeconds}s.
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isPending || isBlocked}>
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isPending || isBlocked}
              onClick={() => {
                visitorMutation.mutate();
              }}
            >
              {visitorMutation.isPending ? "Entrando..." : "Entrar como visitante"}
            </Button>

            <a
              href={`${API_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Ver documentação da API
            </a>
          </form>
        </CardContent>
      </Card>

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
            className="size-6"
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
            className="size-6"
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
