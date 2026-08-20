"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIngestText } from "@/hooks/use-ingest-text";
import { useTextPatternSets } from "@/hooks/use-text-patterns";
import { RateLimitError } from "@/lib/api";
import { translateError } from "@/lib/errors";
import { ingestSchema, type IngestFormValues } from "@/lib/ingest-schema";
import { useAuthStore } from "@/store/auth";

export default function IngestPage() {
  const role = useAuthStore((s) => s.role);
  const router = useRouter();

  useEffect(() => {
    if (role !== null && role !== "ADMIN") {
      router.replace("/whiteboard");
    }
  }, [role, router]);

  if (role !== "ADMIN") {
    return null;
  }

  return <IngestForm />;
}

function IngestForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const { data: patternSets, isLoading: isLoadingPatterns } = useTextPatternSets();
  const { mutate, isPending, error, data, reset: resetMutation } = useIngestText();

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<IngestFormValues>({
    resolver: zodResolver(ingestSchema),
    defaultValues: { file: null },
  });
  const file = useWatch({ control, name: "file" });

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

  const patternSetId = patternSets?.[0]?.id;
  const isBlocked = retryAfterSeconds > 0;

  function handleFileChange(selected: File | null): void {
    resetMutation();
    setValue("file", selected, { shouldValidate: selected !== null });
  }

  async function onSubmit(values: IngestFormValues): Promise<void> {
    if (values.file === null || patternSetId === undefined) {
      return;
    }
    const text = await values.file.text();
    mutate(
      { text, patternSetId },
      {
        onError: (mutationError) => {
          if (mutationError instanceof RateLimitError) {
            setRetryAfterSeconds(Math.ceil(mutationError.retryAfterSeconds));
          }
        },
      },
    );
  }

  const canSubmit =
    file !== null && patternSetId !== undefined && !isPending && !isBlocked;

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link
        href="/whiteboard"
        className="mb-4 inline-flex items-center gap-1.5 text-muted text-sm hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar
      </Link>
      <h1 className="mb-1 font-semibold text-lg">Ingestão de texto</h1>
      <p className="mb-4 text-muted text-sm">
        Envie um arquivo .txt. CPF, CNPJ e CEP+número encontrados no texto viram
        entidades vinculadas à fonte, e são automaticamente linkados a entidades já
        existentes no grafo.
      </p>

      <Card>
        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                handleFileChange(e.target.files?.[0] ?? null);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full flex-col gap-2 border-dashed py-6"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <Upload size={16} className="text-muted" />
              {file === null ? "Selecionar arquivo .txt" : "Trocar arquivo"}
            </Button>

            {file !== null ? (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <FileText size={14} className="shrink-0 text-muted" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-muted">
                  ({Math.ceil(file.size / 1024)} KB)
                </span>
              </div>
            ) : null}

            <Button type="submit" className="mt-4 w-full" disabled={!canSubmit}>
              {isPending
                ? "Processando..."
                : isLoadingPatterns
                  ? "Carregando padrões..."
                  : "Enviar"}
            </Button>

            {errors.file ? (
              <p className="mt-3 text-amber-500 text-sm">{errors.file.message}</p>
            ) : isBlocked ? (
              <p className="mt-3 text-amber-500 text-sm">
                Limite atingido. Tente novamente em {retryAfterSeconds}s.
              </p>
            ) : error ? (
              <p className="mt-3 text-red-500 text-sm">{translateError(error)}</p>
            ) : null}

            {data ? (
              <Alert className="mt-3 border-emerald-500/40">
                <AlertDescription className="text-emerald-400">
                  {data.nodes.length} entidade(s) e {data.edges.length} relação(ões)
                  extraídas.
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/whiteboard");
                    }}
                    className="block underline hover:text-emerald-300"
                  >
                    Ver no grafo
                  </button>
                </AlertDescription>
              </Alert>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
