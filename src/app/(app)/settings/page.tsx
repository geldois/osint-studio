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
import { Input } from "@/components/ui/input";
import { useCredentialStatus } from "@/hooks/use-credential-status";
import { saveCredential } from "@/lib/api";
import { translateError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import type { Provider } from "@/types/api";

const PROVIDER_LABELS: Record<Provider, string> = {
  KIPFLOW: "KipFlow",
  PORTAL_TRANSPARENCIA: "Portal da Transparência",
};

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
    formState: { errors },
  } = useForm<CredentialFormValues>({ resolver: zodResolver(credentialSchema) });

  const mutation = useMutation({
    mutationFn: (values: CredentialFormValues) =>
      saveCredential(provider, values.apiKey, token),
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ["credential-status"] });
    },
  });

  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{PROVIDER_LABELS[provider]}</span>
        <Badge variant={configured ? "default" : "destructive"}>
          {configured ? "Configurado" : "Não configurado"}
        </Badge>
      </div>
      <form
        onSubmit={(e) => {
          void handleSubmit((values) => {
            mutation.mutate(values);
          })(e);
        }}
        className="flex items-center gap-2"
      >
        <Input type="password" placeholder="Chave da API" {...register("apiKey")} />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
      {errors.apiKey ? (
        <span className="text-red-500 text-sm">{errors.apiKey.message}</span>
      ) : mutation.error ? (
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
      <Link
        href="/whiteboard"
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
