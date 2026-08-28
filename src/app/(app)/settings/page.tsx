"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/password-input";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { revealCredential, saveCredential } from "@/lib/api";
import { translateError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import type { Provider } from "@/types/api";

const PROVIDER_LABELS: Record<Provider, string> = {
  KIPFLOW: "KipFlow",
  PORTAL_TRANSPARENCIA: "Portal da Transparência",
};

const MASKED_SENTINEL = "•".repeat(24);

const credentialSchema = z.object({
  apiKey: z.string().min(1, "Informe a chave da API."),
});
type CredentialFormValues = z.infer<typeof credentialSchema>;

function CredentialRow({
  configured,
  provider,
  token,
}: {
  configured: boolean;
  provider: Provider;
  token: string;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: { apiKey: configured ? MASKED_SENTINEL : "" },
  });

  useEffect(() => {
    reset({ apiKey: configured ? MASKED_SENTINEL : "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const revealMutation = useMutation({
    mutationFn: () => revealCredential(provider, token),
    onSuccess: (apiKey) => {
      setValue("apiKey", apiKey);
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CredentialFormValues) =>
      saveCredential(provider, values.apiKey, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["credential-status"] });
    },
  });

  function onSubmit(values: CredentialFormValues): void {
    if (!dirtyFields.apiKey) {
      return;
    }
    mutation.mutate(values);
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{PROVIDER_LABELS[provider]}</span>
        <Badge variant={configured ? "default" : "destructive"}>
          {configured ? "Configurado" : "Não configurado"}
        </Badge>
      </div>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        className="flex items-center gap-2"
      >
        <PasswordInput
          placeholder="Chave da API"
          onReveal={() => {
            if (configured && !revealMutation.isSuccess && !revealMutation.isPending) {
              revealMutation.mutate();
            }
          }}
          {...register("apiKey")}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
      {errors.apiKey ? (
        <span className="text-red-500 text-sm">{errors.apiKey.message}</span>
      ) : mutation.error ? (
        <span className="text-red-500 text-sm">{translateError(mutation.error)}</span>
      ) : revealMutation.error ? (
        <span className="text-red-500 text-sm">
          {translateError(revealMutation.error)}
        </span>
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
      router.replace("/graph");
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
    <div className="mx-auto max-w-lg p-3">
      <Link
        href="/graph"
        className="mb-4 inline-flex items-center gap-1.5 text-muted text-sm hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar
      </Link>
      <h1 className="mb-4 font-semibold text-lg">Configurações</h1>
      {isLoading ? <p className="text-muted text-sm">Carregando...</p> : null}
      {error ? <p className="text-red-500 text-sm">{translateError(error)}</p> : null}
      {data ? (
        <Card>
          <CardContent className="divide-y divide-border">
            {data.map((status) => (
              <CredentialRow
                key={status.provider}
                configured={status.configured}
                provider={status.provider}
                token={token}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
