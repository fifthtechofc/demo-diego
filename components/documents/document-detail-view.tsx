import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

import type { DocumentWithRelations } from "@/types/document";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const clientFields: { key: keyof NonNullable<DocumentWithRelations["extraction"]>; label: string }[] = [
  { key: "hospital_name", label: "Hospital" },
  { key: "cnpj", label: "CNPJ" },
  { key: "address", label: "Endereço" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "UF" },
  { key: "cep", label: "CEP" },
];

const headerFields: { key: keyof NonNullable<DocumentWithRelations["extraction"]>; label: string }[] = [
  { key: "doctor_name", label: "Médico" },
  { key: "patient_name", label: "Paciente" },
  { key: "insurance_name", label: "Plano de saúde" },
  { key: "cpf", label: "CPF" },
  { key: "surgery_date", label: "Data da cirurgia" },
  { key: "surgery_name", label: "Cirurgia" },
];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "processed") return "default";
  if (status === "error") return "destructive";
  return "secondary";
}

function formatMaybeDateTime(value: string): string {
  const raw = value.trim();
  if (!raw) return "—";

  // Prefer string-based formatting to avoid timezone shifts.
  // ISO with offset: 2026-04-29T13:00:00+00:00 -> show 29/04/2026 13:00
  const iso = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+\-]\d{2}:\d{2})$/,
  );
  if (iso) {
    const [, yyyy, mm, dd, hh, min] = iso;
    const yy = yyyy.slice(-2);
    return `${dd}/${mm}/${yy} - ${hh}:${min}`;
  }

  // "YYYY-MM-DD HH:mm" or "YYYY-MM-DD"
  const ymdTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (ymdTime) {
    const [, yyyy, mm, dd, hh, min] = ymdTime;
    const yy = yyyy.slice(-2);
    return `${dd}/${mm}/${yy} - ${hh}:${min}`;
  }
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const [, yyyy, mm, dd] = ymd;
    const yy = yyyy.slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  // Fallback: try Date parsing if it's something else.
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return /\d{2}:\d{2}/.test(raw) ? format(d, "dd/MM/yyyy HH:mm") : format(d, "dd/MM/yyyy");
}

export function DocumentDetailView({ doc }: { doc: DocumentWithRelations }) {
  const ext = doc.extraction;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 pb-16 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/historico"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Histórico
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
              {doc.file_name}
            </h1>
            <Badge variant={statusVariant(doc.status)} className="uppercase">
              {doc.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {(doc.file_size / 1024).toFixed(1)} KB · {new Date(doc.created_at).toLocaleString("pt-BR")}
          </p>
          {doc.processing_error && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/25 px-3 py-2 text-sm text-red-200">
              {doc.processing_error}
            </p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-5 shadow-sm ring-1 ring-white/5 backdrop-blur sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
            Dados extraídos
          </h2>
          <Image
            src="/images/Logo.png"
            alt=""
            width={260}
            height={64}
            className="h-10 w-auto object-contain object-right brightness-0 invert sm:h-12"
            priority={false}
          />
        </div>
        {!ext ? (
          <p className="text-sm text-zinc-500">Nenhuma extração disponível ainda.</p>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="mb-5 text-center">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-300">
                  Dados do cliente
                </h3>
                <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-zinc-700/70 to-transparent" />
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                {clientFields.map(({ key, label }) => {
                  const val = ext[key];
                  const str = typeof val === "string" && val.trim() ? val : "—";
                  return (
                    <div key={key} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
                      <dd className="mt-1 text-sm text-zinc-100">{str}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            <div>
              <div className="mb-5 text-center">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-300">
                  Médico e paciente
                </h3>
                <div className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-zinc-700/70 to-transparent" />
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                {headerFields.map(({ key, label }) => {
                  const val = ext[key];
                  const str =
                    typeof val === "string" && val.trim()
                      ? key === "surgery_date"
                        ? formatMaybeDateTime(val)
                        : val
                      : "—";
                  return (
                    <div key={key} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
                      <dd className="mt-1 text-sm text-zinc-100">{str}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full border-zinc-700/70 bg-zinc-950/30 text-zinc-100 hover:bg-zinc-900/50 hover:text-zinc-50 sm:w-auto"
              >
                Enviar para os responsáveis
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
