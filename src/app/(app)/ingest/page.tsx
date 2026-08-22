"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { IngestForm } from "@/components/ingest/ingest-form";
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

  return (
    <div className="mx-auto max-w-lg p-3 sm:p-4">
      <Link
        href="/whiteboard"
        className="mb-2.5 inline-flex items-center gap-1.5 text-muted text-sm hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar
      </Link>
      <h1 className="mb-1 font-semibold text-lg">Ingestão de arquivo</h1>
      <p className="mb-2.5 text-muted text-sm">
        Envie um .txt, .csv ou .xlsx. Os documentos encontrados viram entidades
        vinculadas à fonte, e são automaticamente linkados a entidades já existentes no
        grafo.
      </p>

      <IngestForm />
    </div>
  );
}
