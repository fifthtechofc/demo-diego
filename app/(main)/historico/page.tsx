import Link from "next/link";
import { AnimatedText } from "@/components/ui/animated-text";
import { listDocumentsForHistory } from "@/services/document.service";
import { Badge } from "@/components/ui/badge";

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
    <div className="p-8">
      <AnimatedText
        text="Histórico"
        className="items-start justify-start"
        textClassName="text-left text-2xl font-semibold tracking-tight text-zinc-100"
      />
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        Documentos enviados pelo fluxo de PDF. Clique para ver extração e itens.
      </p>

      <div className="mt-8 max-w-3xl space-y-3">
        {loadError && (
          <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {loadError}
          </p>
        )}
        {!loadError && documents.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhum documento ainda. Envie um PDF em Novo PDF.</p>
        )}
        {documents.map((d) => (
          <Link
            key={d.id}
            href={`/documents/${d.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-100">{d.file_name}</p>
              <p className="text-xs text-zinc-500">
                {new Date(d.created_at).toLocaleString("pt-BR")} · {(d.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Badge variant={statusVariant(d.status)} className="shrink-0 uppercase">
              {d.status}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
