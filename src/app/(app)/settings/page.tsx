"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { saveCredential } from "@/lib/api";
import { translateError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import type { Provider } from "@/types/api";

const PROVIDER_LABELS: Record<Provider, string> = {
  PORTAL_TRANSPARENCIA: "Portal da Transparência",
};

function CredentialRow({
  configured,
  provider,
  token,
}: {
  configured: boolean;
  provider: Provider;
  token: string;
}) {
  const [apiKey, setApiKey] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => saveCredential(provider, apiKey, token),
    onSuccess: () => {
      setApiKey("");
      void queryClient.invalidateQueries({ queryKey: ["credential-status"] });
    },
  });

  return (
    <div className="flex flex-col gap-2 border-border border-b py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{PROVIDER_LABELS[provider]}</span>
        <span className={configured ? "text-emerald-500 text-xs" : "text-red-500 text-xs"}>
          {configured ? "✓ configurado" : "✗ não configurado"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
          }}
          placeholder="Chave da API"
          className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={mutation.isPending || apiKey.trim() === ""}
          onClick={() => {
            mutation.mutate();
          }}
          className="rounded bg-white px-3 py-1.5 font-medium text-black text-sm disabled:opacity-50"
        >
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {mutation.error ? (
        <span className="text-red-500 text-sm">{translateError(mutation.error)}</span>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const router = useRouter();

  useEffect(() => {
    if (role !== null && role !== "ADMIN") {
      router.replace("/whiteboard");
    }
  }, [role, router]);

  if (role !== "ADMIN" || token === null) {
    return null;
  }

  return <SettingsForm token={token} />;
}

function SettingsForm({ token }: { token: string }) {
  const { data, error, isLoading } = useCredentialStatus();

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 font-semibold text-lg">Configurações</h1>
      {isLoading ? <p className="text-muted text-sm">Carregando...</p> : null}
      {error ? <p className="text-red-500 text-sm">{translateError(error)}</p> : null}
      {data ? (
        <div className="rounded border border-border px-4">
          {data.map((status) => (
            <CredentialRow
              key={status.provider}
              configured={status.configured}
              provider={status.provider}
              token={token}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
