"use client";

import { ArrowLeft, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useIngestText } from "@/hooks/use-ingest-text";
import { useTextPatternSets } from "@/hooks/use-text-patterns";
import { RateLimitError } from "@/lib/api";
import { translateError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";

const MAX_FILE_BYTES = 500_000;

function isTxtFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
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

  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const { data: patternSets, isLoading: isLoadingPatterns } = useTextPatternSets();
  const { mutate, isPending, error, data, reset } = useIngestText();

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
    reset();
    setLocalError(null);
    if (selected === null) {
      setFile(null);
      return;
    }
    if (!isTxtFile(selected)) {
      setFile(null);
      setLocalError("Selecione um arquivo .txt.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setLocalError("Arquivo muito grande (limite de 500 KB).");
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(): Promise<void> {
    if (file === null || patternSetId === undefined) {
      return;
    }
    setLocalError(null);
    const text = await file.text();
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
        Envie um arquivo .txt. CPF, CNPJ e CEP+número encontrados no texto viram entidades
        vinculadas à fonte, e são automaticamente linkados a entidades já existentes no grafo.
      </p>

      <div className="rounded border border-border p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => {
            handleFileChange(e.target.files?.[0] ?? null);
          }}
        />
        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
          }}
          className="flex w-full items-center justify-center gap-2 rounded border border-border border-dashed bg-surface px-3 py-6 text-sm hover:bg-white/10"
        >
          <Upload size={16} className="text-muted" />
          {file === null ? "Selecionar arquivo .txt" : "Trocar arquivo"}
        </button>

        {file !== null ? (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <FileText size={14} className="shrink-0 text-muted" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-muted">({Math.ceil(file.size / 1024)} KB)</span>
          </div>
        ) : null}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            void handleSubmit();
          }}
          className="mt-4 w-full rounded bg-white px-3 py-1.5 font-medium text-black text-sm disabled:opacity-50"
        >
          {isPending
            ? "Processando..."
            : isLoadingPatterns
              ? "Carregando padrões..."
              : "Enviar"}
        </button>

        {localError ? <p className="mt-3 text-amber-500 text-sm">{localError}</p> : null}
        {isBlocked ? (
          <p className="mt-3 text-amber-500 text-sm">
            Limite atingido. Tente novamente em {retryAfterSeconds}s.
          </p>
        ) : error ? (
          <p className="mt-3 text-red-500 text-sm">{translateError(error)}</p>
        ) : null}

        {data ? (
          <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <p className="text-emerald-400">
              {data.nodes.length} entidade(s) e {data.edges.length} relação(ões) extraídas.
            </p>
            <button
              type="button"
              onClick={() => {
                router.push("/whiteboard");
              }}
              className="mt-2 text-emerald-400 underline hover:text-emerald-300"
            >
              Ver no grafo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
