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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIngest } from "@/hooks/use-ingest";
import { useTextPatternCatalog } from "@/hooks/use-text-patterns";
import { RateLimitError } from "@/lib/api";
import { translateError } from "@/lib/errors";
import {
  defaultSelectedPatterns,
  ingestSchema,
  type IngestFormValues,
} from "@/lib/ingest-schema";
import { useAuthStore } from "@/store/auth";

const PATTERN_NODE_TYPE_LABELS: Record<string, string> = {
  Address: "Endereço",
  Company: "Empresa",
  Person: "Pessoa",
};

function patternNodeTypeLabel(nodeType: string): string {
  return PATTERN_NODE_TYPE_LABELS[nodeType] ?? nodeType;
}

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

  const { data: catalog, isLoading: isLoadingPatterns } = useTextPatternCatalog();
  const { mutate, isPending, error, data, reset: resetMutation } = useIngest();

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<IngestFormValues>({
    resolver: zodResolver(ingestSchema),
    defaultValues: { file: null, patterns: [] },
  });
  const file = useWatch({ control, name: "file" });
  const patterns = useWatch({ control, name: "patterns" });

  const hasSeededPatterns = useRef(false);

  useEffect(() => {
    if (catalog !== undefined && !hasSeededPatterns.current) {
      hasSeededPatterns.current = true;
      setValue("patterns", defaultSelectedPatterns(catalog));
    }
  }, [catalog, setValue]);

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

  const isBlocked = retryAfterSeconds > 0;

  function handleFileChange(selected: File | null): void {
    resetMutation();
    setValue("file", selected, { shouldValidate: selected !== null });
  }

  function onSubmit(values: IngestFormValues): void {
    if (values.file === null) {
      return;
    }
    mutate(
      { file: values.file, patterns: values.patterns },
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
    file !== null &&
    patterns.length > 0 &&
    !isPending &&
    !isBlocked &&
    !isLoadingPatterns;

  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6">
      <Link
        href="/whiteboard"
        className="mb-4 inline-flex items-center gap-1.5 text-muted text-sm hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar
      </Link>
      <h1 className="mb-1 font-semibold text-lg">Ingestão de arquivo</h1>
      <p className="mb-4 text-muted text-sm">
        Envie um .txt, .csv ou .xlsx. Os documentos encontrados viram entidades
        vinculadas à fonte, e são automaticamente linkados a entidades já existentes no
        grafo.
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
              accept=".txt,.csv,.xlsx"
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
              {file === null ? "Selecionar arquivo" : "Trocar arquivo"}
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

            <fieldset className="mt-4">
              <legend className="mb-2 font-medium text-sm">Padrões de extração</legend>
              {isLoadingPatterns ? (
                <p className="text-muted text-sm">Carregando padrões...</p>
              ) : catalog === undefined ? null : (
                <ToggleGroup
                  multiple
                  variant="outline"
                  size="sm"
                  value={patterns}
                  onValueChange={(selected) => {
                    setValue("patterns", selected, { shouldValidate: true });
                  }}
                  className="flex w-full flex-wrap"
                >
                  {catalog.patterns.map((pattern) => (
                    <ToggleGroupItem key={pattern.name} value={pattern.name}>
                      {pattern.name}
                      <span className="ml-1.5 text-xs opacity-60">
                        {patternNodeTypeLabel(pattern.node_type)}
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            </fieldset>

            <Button type="submit" className="mt-4 w-full" disabled={!canSubmit}>
              {isPending ? "Processando..." : "Enviar"}
            </Button>

            {errors.file ? (
              <p className="mt-3 text-amber-500 text-sm">{errors.file.message}</p>
            ) : errors.patterns ? (
              <p className="mt-3 text-amber-500 text-sm">{errors.patterns.message}</p>
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
