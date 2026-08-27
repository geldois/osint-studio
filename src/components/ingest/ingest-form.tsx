"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PatternSelect } from "@/components/ingest/pattern-select";
import { useIngest } from "@/hooks/use-ingest";
import { useTextPatternCatalog } from "@/hooks/use-text-patterns";
import { RateLimitError } from "@/lib/api";
import { translateError } from "@/lib/errors";
import {
  defaultSelectedPatterns,
  ingestSchema,
  type IngestFormValues,
} from "@/lib/ingest-schema";

export interface IngestResult {
  nodes: unknown[];
  edges: unknown[];
}

export interface IngestFormProps {
  onSuccess?: (result: IngestResult) => void;
  compact?: boolean;
}

export function IngestForm({ onSuccess, compact = false }: IngestFormProps) {
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

  useEffect(() => {
    if (data) {
      onSuccess?.(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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

  const form = (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          handleFileChange(e.target.files?.[0] ?? null);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full flex-col gap-1.5 border-dashed py-4"
        onClick={() => {
          fileInputRef.current?.click();
        }}
      >
        <Upload size={16} className="text-muted" />
        {file === null ? "Selecionar arquivo" : "Trocar arquivo"}
      </Button>

      {file !== null ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <FileText size={14} className="shrink-0 text-muted" />
          <span className="truncate">{file.name}</span>
          <span className="shrink-0 text-muted">
            ({Math.ceil(file.size / 1024)} KB)
          </span>
        </div>
      ) : null}

      <div className="mt-2.5">
        {isLoadingPatterns ? (
          <p className="text-muted text-sm">Carregando padrões...</p>
        ) : catalog === undefined ? null : (
          <PatternSelect
            catalog={catalog}
            value={patterns}
            onChange={(next) => {
              setValue("patterns", next, { shouldValidate: true });
            }}
          />
        )}
      </div>

      <Button type="submit" className="mt-2.5 w-full" disabled={!canSubmit}>
        {isPending ? "Processando..." : "Enviar"}
      </Button>

      {errors.file ? (
        <p className="mt-2 text-amber-500 text-sm">{errors.file.message}</p>
      ) : errors.patterns ? (
        <p className="mt-2 text-amber-500 text-sm">{errors.patterns.message}</p>
      ) : isBlocked ? (
        <p className="mt-2 text-amber-500 text-sm">
          Limite atingido. Tente novamente em {retryAfterSeconds}s.
        </p>
      ) : error ? (
        <p className="mt-2 text-red-500 text-sm">{translateError(error)}</p>
      ) : null}

      {data ? (
        <Alert className="mt-2 border-emerald-500/40">
          <AlertDescription className="text-emerald-400">
            {data.nodes.length} entidade(s) e {data.edges.length} relação(ões)
            extraídas.
            <button
              type="button"
              onClick={() => {
                router.push("/graph");
              }}
              className="block underline hover:text-emerald-300"
            >
              Ver no grafo
            </button>
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );

  if (compact) {
    return form;
  }

  return (
    <Card>
      <CardContent>{form}</CardContent>
    </Card>
  );
}
