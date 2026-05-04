"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import clsx from "clsx";
import {
  UploadCloud,
  File as FileIcon,
  Loader,
  CheckCircle,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { DocumentWithRelations } from "@/types/document";

type UploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  error?: string | null;
  documentId?: string | null;
};

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export function PdfDocumentUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);

  const hasPanel = items.length > 0;

  const layoutEase = [0.25, 0.1, 0.25, 1] as const;
  const layoutTween = {
    type: "tween" as const,
    duration: 0.42,
    ease: layoutEase,
  };

  const clearPanel = (e?: MouseEvent) => {
    e?.stopPropagation();
    if (busy) return;
    setItems([]);
  };

  const uploadAndProcessOne = useCallback(async (entry: UploadItem) => {
    const setStatus = (patch: Partial<UploadItem>) => {
      setItems((prev) => prev.map((it) => (it.id === entry.id ? { ...it, ...patch } : it)));
    };

    try {
      setStatus({ status: "uploading", error: null });
      const fd = new FormData();
      fd.set("file", entry.file);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const ct = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const json =
        ct.includes("application/json")
          ? ((JSON.parse(raw) as unknown) as { document?: DocumentWithRelations; error?: string })
          : null;
      if (!res.ok) throw new Error(json?.error || raw.slice(0, 280) || `HTTP ${res.status}`);
      const docId = json?.document?.id;
      if (!docId) throw new Error("Resposta inválida do servidor (sem id).");

      setStatus({ status: "processing", documentId: docId });
      const res2 = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      const ct2 = res2.headers.get("content-type") ?? "";
      const raw2 = await res2.text();
      const json2 =
        ct2.includes("application/json")
          ? ((JSON.parse(raw2) as unknown) as { document?: DocumentWithRelations; error?: string })
          : null;
      if (!res2.ok) throw new Error(json2?.error || raw2.slice(0, 280) || `HTTP ${res2.status}`);
      const full = json2?.document;
      if (!full?.id) throw new Error("Resposta inválida do processamento.");

      setStatus({ status: "done", documentId: full.id });
      return full.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado.";
      setStatus({ status: "error", error: msg });
      return null;
    }
  }, []);

  const enqueueAndRun = useCallback(
    async (files: File[]) => {
      const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      const sliced = pdfs.slice(0, 20);
      if (sliced.length === 0) {
        toast.error("Selecione PDFs válidos.");
        return;
      }
      if (pdfs.length > 20) toast.warning("Limite de 20 PDFs por vez. Enviando os 20 primeiros.");

      setBusy(true);
      const now = Date.now();
      const newItems: UploadItem[] = sliced.map((file, idx) => ({
        id: `${now}-${idx}-${file.name}-${file.size}-${file.lastModified}`,
        file,
        name: file.name,
        size: file.size,
        status: "queued",
        error: null,
        documentId: null,
      }));
      setItems(newItems);

      // Concurrency limit avoids saturating Vercel/Supabase and prevents timeouts.
      const concurrency = 3;
      const doneIds = await runPool(newItems, concurrency, uploadAndProcessOne);
      const ok = doneIds.filter(Boolean).length;
      const fail = doneIds.length - ok;
      if (ok) toast.success(`${ok} PDF(s) processado(s) com sucesso.`);
      if (fail) toast.error(`${fail} PDF(s) falharam. Veja os erros na lista.`);
      setBusy(false);
      router.refresh();

      const successIds = doneIds.filter(Boolean) as string[];
      if (successIds.length) {
        const batch = encodeURIComponent(successIds.join(","));
        router.push(`/documents/${successIds[0]}?batch=${batch}`);
      }
    },
    [router, uploadAndProcessOne],
  );

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (list.length) void enqueueAndRun(list);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (list.length) void enqueueAndRun(list);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  return (
    <div
      className={clsx(
        "mx-auto w-full p-4 transition-[max-width] duration-300 ease-out md:p-6",
        hasPanel ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <LayoutGroup id="pdf-upload-columns">
        <div
          className={clsx(
            "flex w-full overflow-x-hidden",
            hasPanel
              ? "flex-col gap-8 sm:flex-row sm:items-stretch sm:gap-6 md:gap-8"
              : "flex-col",
          )}
        >
          <motion.div
            layout="size"
            transition={{ layout: layoutTween }}
            className={clsx("min-w-0", hasPanel ? "w-full sm:w-1/2" : "w-full")}
          >
            <motion.div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !busy && inputRef.current?.click()}
              initial={false}
              animate={{
                borderColor: isDragging ? "#71717a" : "#ffffff10",
                scale: isDragging ? 1.02 : 1,
              }}
              transition={{ duration: 0.2 }}
              className={clsx(
                "group relative cursor-pointer rounded-2xl border border-zinc-300/20 bg-secondary/50 text-center shadow-sm backdrop-blur hover:shadow-md dark:border-zinc-600/40",
                hasPanel ? "p-6 md:p-8" : "p-8 md:p-12",
                isDragging &&
                  "border-zinc-500 ring-4 ring-zinc-400/25 dark:border-zinc-400",
                busy && "pointer-events-none opacity-80",
              )}
            >
              <div className="flex flex-col items-center gap-4 md:gap-5">
                <motion.div
                  animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: isDragging ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className="relative"
                >
                  <motion.div
                    animate={{
                      opacity: isDragging ? [0.5, 1, 0.5] : 1,
                      scale: isDragging ? [0.95, 1.05, 0.95] : 1,
                    }}
                    transition={{
                      duration: 2,
                      repeat: isDragging ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                    className="absolute -inset-4 rounded-full bg-zinc-400/15 blur-md dark:bg-zinc-500/10"
                    style={{ display: isDragging ? "block" : "none" }}
                  />
                  <UploadCloud
                    className={clsx(
                      "h-14 w-14 drop-shadow-sm transition-colors duration-300 sm:h-16 sm:w-16 md:h-20 md:w-20",
                      isDragging
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100",
                    )}
                  />
                </motion.div>

                <div className="space-y-1.5 md:space-y-2">
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 sm:text-xl md:text-2xl">
                    {isDragging
                      ? "Solte o PDF aqui"
                      : hasPanel
                        ? "Adicionar outro PDF"
                        : "Envie seu PDF"}
                  </h3>
                  <p className="mx-auto max-w-md text-sm text-zinc-600 dark:text-zinc-300 sm:text-base md:text-lg">
                    {isDragging ? (
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Solte para enviar
                      </span>
                    ) : (
                      <>
                        Arraste e solte ou{" "}
                        <span className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
                          clique para escolher
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                    Apenas PDF, até 12 MB. O sistema extrai e salva os dados.
                  </p>
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  hidden
                  disabled={busy}
                  onChange={onPick}
                />
              </div>
            </motion.div>
          </motion.div>

          <AnimatePresence mode="sync">
            {hasPanel && (
              <motion.div
                key="pdf-panel"
                layout="size"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  layout: layoutTween,
                  opacity: { duration: 0.28, ease: layoutEase },
                }}
                className="flex w-full min-w-0 flex-col sm:w-1/2 sm:border-l sm:border-zinc-800/25 sm:pl-6 md:pl-8"
              >
                <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 sm:text-lg md:text-xl">
                    Arquivos ({items.length})
                  </h3>
                  {!busy && (
                    <button
                      type="button"
                      onClick={clearPanel}
                      className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 hover:text-zinc-950 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 dark:hover:text-zinc-50"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-[min(70vh,32rem)]">
                  {items.map((it) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: layoutEase }}
                      className="flex items-start gap-3 rounded-xl bg-zinc-50 px-3 py-3 shadow transition-all duration-200 hover:shadow-md dark:bg-zinc-800/80 sm:gap-4 sm:px-4 sm:py-4"
                    >
                      <div className="relative flex-shrink-0">
                        <FileIcon className="h-16 w-16 text-zinc-400 md:h-20 md:w-20" />
                        {it.status === "done" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -bottom-2 -right-2 rounded-full bg-white shadow-sm dark:bg-zinc-800"
                          >
                            <CheckCircle className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                          </motion.div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex w-full flex-col gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileIcon className="h-5 w-5 flex-shrink-0 text-zinc-600 dark:text-zinc-400" />
                            <h4
                              className="truncate text-base font-medium text-zinc-800 dark:text-zinc-200 md:text-lg"
                              title={it.name}
                            >
                              {it.name}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                            <span className="text-xs md:text-sm">
                              {formatFileSize(it.size)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium">
                                {it.status === "queued"
                                  ? "Fila"
                                  : it.status === "uploading"
                                    ? "Enviando"
                                    : it.status === "processing"
                                      ? "Processando"
                                      : it.status === "done"
                                        ? "OK"
                                        : "Erro"}
                              </span>
                              {it.status === "uploading" || it.status === "processing" ? (
                                <Loader className="h-4 w-4 animate-spin text-zinc-600 dark:text-zinc-300" />
                              ) : (
                                <button
                                  type="button"
                                  className="cursor-pointer border-0 bg-transparent p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (busy) return;
                                    setItems((prev) => prev.filter((x) => x.id !== it.id));
                                  }}
                                  aria-label="Remover item"
                                >
                                  <Trash2 className="h-4 w-4 text-zinc-400 transition-colors duration-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100" />
                                </button>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          {it.status === "uploading" || it.status === "processing" ? (
                            <motion.div
                              className="h-full rounded-full bg-zinc-500 shadow-inner dark:bg-zinc-400"
                              initial={{ width: "25%" }}
                              animate={{ width: ["28%", "82%", "35%", "75%", "28%"] }}
                              transition={{
                                duration: 2.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          ) : (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: it.status === "error" ? "0%" : "100%" }}
                              transition={{
                                duration: 0.4,
                                type: "spring",
                                stiffness: 100,
                                ease: "easeOut",
                              }}
                              className={clsx(
                                "h-full rounded-full shadow-inner",
                                it.status === "error"
                                  ? "bg-zinc-400 dark:bg-zinc-600"
                                  : "bg-zinc-900 dark:bg-zinc-100",
                              )}
                            />
                          )}
                        </div>

                        {it.status === "error" && it.error && (
                          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-left text-sm text-red-200">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{it.error}</span>
                          </div>
                        )}

                        {it.status === "done" && it.documentId && (
                          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span
                              className="cursor-pointer underline underline-offset-2"
                              onClick={() => router.push(`/documents/${it.documentId}`)}
                            >
                              Ver documento
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </div>
  );
}
