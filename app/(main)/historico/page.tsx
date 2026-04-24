import Link from "next/link";
import { AnimatedText } from "@/components/ui/animated-text";
import { listDocumentsForHistory } from "@/services/document.service";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "processed") return "default";
  if (status === "error") return "destructive";
  return "secondary";
}

export default async function HistoricoPage() {
  let documents: Awaited<ReturnType<typeof listDocumentsForHistory>> = [];
  let loadError: string | null = null;
  try {
    documents = await listDocumentsForHistory();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Não foi possível carregar o histórico.";
  }

  return (
    <div className="px-6 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
      <AnimatedText
        text="Histórico"
        className="items-start justify-start"
        textClassName="text-left text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl"
      />
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Documentos enviados pelo fluxo de PDF. Clique em um item para ver a extração e os detalhes.
      </p>

      <div className="mt-8 space-y-3">
        {loadError && (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-4 text-sm text-zinc-200">
            <p className="font-medium text-zinc-50">Não foi possível carregar o histórico</p>
            <p className="mt-1 text-zinc-400">{loadError}</p>
          </div>
        )}
        {!loadError && documents.length === 0 && (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-6 text-sm">
            <p className="font-medium text-zinc-50">Nenhum documento ainda</p>
            <p className="mt-1 text-zinc-400">Envie um PDF em Novo PDF para começar a ver itens aqui.</p>
          </div>
        )}

        {documents.length > 0 && (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/30 p-2">
            <div className="px-2 pb-2 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {documents.length} {documents.length === 1 ? "documento" : "documentos"}
              </p>
            </div>
            <div className="space-y-1">
              {documents.map((d) => (
                <Link
                  key={d.id}
                  href={`/documents/${d.id}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-transparent bg-transparent px-3 py-3 transition hover:border-zinc-800/70 hover:bg-zinc-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-50">{d.file_name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(d.created_at).toLocaleString("pt-BR")} · {(d.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={statusVariant(d.status)} className="shrink-0 uppercase tracking-wide">
                      {d.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:text-zinc-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
