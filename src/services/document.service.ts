import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { parseDocumentItems, parseExtractionFromText } from "@/lib/extraction/parse-fields";
import type {
  DocumentRow,
  DocumentWithRelations,
  ParsedExtractionFields,
} from "@/types/document";

const BUCKET = "documents";
const MAX_BYTES = 12 * 1024 * 1024;

function isTransientSupabaseError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
          ? String((err as { message?: unknown }).message)
          : "";
  const m = msg.toLowerCase();
  return (
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("etimedout") ||
    m.includes("econnreset") ||
    m.includes("socket hang up") ||
    m.includes("network") ||
    m.includes("fetch failed")
  );
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delaysMs = [400, 900, 1800];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const transient = isTransientSupabaseError(e);
      if (!transient || attempt === delaysMs.length) break;
      await new Promise((r) => setTimeout(r, delaysMs[attempt]));
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`${label}: ${msg}`);
}

export function assertPdfFile(file: File): void {
  const name = file.name.toLowerCase();
  const okMime = file.type === "application/pdf" || file.type === "";
  const okExt = name.endsWith(".pdf");
  if (!okMime && !okExt) throw new Error("Envie apenas arquivos PDF.");
  if (!okExt) throw new Error("O arquivo deve ter extensão .pdf");
  if (file.size > MAX_BYTES) throw new Error("PDF acima do limite de 12 MB.");
  if (file.size === 0) throw new Error("Arquivo vazio.");
}

export function buildStoragePath(originalName: string): string {
  const safe =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const base = originalName.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  return `uploads/${Date.now()}_${safe}_${base || "document.pdf"}`;
}

export async function uploadPdfAndCreateDocument(file: File): Promise<{ id: string }> {
  assertPdfFile(file);
  const supabase = createServiceRoleClient();
  const path = buildStoragePath(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await withRetry(
    async () =>
      supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: "application/pdf",
        upsert: false,
      }),
    "Falha no upload para o storage",
  );
  if (upErr) throw new Error(upErr.message || "Falha no upload para o storage.");

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const file_url = pub?.publicUrl ?? null;

  const { data: row, error: insErr } = await withRetry(
    async () =>
      supabase
        .from("documents")
        .insert({
          file_name: file.name,
          file_path: path,
          file_url,
          file_size: file.size,
          mime_type: "application/pdf",
          status: "processing",
          processing_error: null,
        })
        .select("id")
        .single(),
    "Falha ao criar registro no banco",
  );

  if (insErr || !row?.id) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
    throw new Error(insErr?.message || "Não foi possível criar o registro do documento.");
  }

  return { id: row.id as string };
}

async function replaceItems(supabase: ReturnType<typeof createServiceRoleClient>, documentId: string, items: { content: string }[]) {
  const { error: delErr } = await supabase.from("document_items").delete().eq("document_id", documentId);
  if (delErr) throw new Error(`Falha ao limpar itens: ${delErr.message}`);
  if (items.length === 0) return;
  const rows = items.map((it, i) => ({
    document_id: documentId,
    content: it.content,
    sort_order: i,
  }));
  const { error } = await supabase.from("document_items").insert(rows);
  if (error) throw new Error(`Falha ao inserir itens: ${error.message}`);
}

async function upsertExtraction(
  supabase: ReturnType<typeof createServiceRoleClient>,
  documentId: string,
  raw_text: string,
  fields: ParsedExtractionFields,
) {
  const payload = {
    document_id: documentId,
    raw_text,
    ...fields,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("document_extractions").upsert(payload, {
    onConflict: "document_id",
  });
  if (error) throw new Error(`Falha ao salvar extração: ${error.message}`);
}

async function upsertCalendarEventFromExtraction(
  supabase: ReturnType<typeof createServiceRoleClient>,
  documentId: string,
  fields: ParsedExtractionFields,
) {
  if (!fields.event_start_at) return;

  const start_at = fields.event_start_at;
  const end_at = fields.event_end_at ?? null;

  const titleBase =
    fields.surgery_name?.trim() ||
    fields.patient_name?.trim() ||
    "Evento do documento";

  const title = fields.surgery_name ? `Procedimento: ${titleBase}` : titleBase;
  const descriptionParts = [
    fields.patient_name ? `Paciente: ${fields.patient_name}` : null,
    fields.doctor_name ? `Médico: ${fields.doctor_name}` : null,
    fields.hospital_name ? `Hospital: ${fields.hospital_name}` : null,
    fields.surgery_date ? `Data extraída: ${fields.surgery_date}` : null,
  ].filter(Boolean);

  const description = descriptionParts.length ? descriptionParts.join("\n") : null;

  // Como a unique é parcial (source='pdf'), fazemos "select then update/insert"
  const { data: existing, error: selErr } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("document_id", documentId)
    .eq("source", "pdf")
    .maybeSingle();

  if (selErr) throw new Error(`Falha ao buscar evento do calendário: ${selErr.message}`);

  if (existing?.id) {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        title,
        description,
        start_at,
        end_at,
        category: "Procedimento",
        color: "blue",
        tags: ["PDF"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Falha ao atualizar evento do calendário: ${error.message}`);
    return;
  }

  const { error } = await supabase.from("calendar_events").insert({
    title,
    description,
    start_at,
    end_at,
    category: "Procedimento",
    color: "blue",
    tags: ["PDF"],
    source: "pdf",
    document_id: documentId,
  });

  if (error) throw new Error(`Falha ao criar evento do calendário: ${error.message}`);
}

export async function processDocumentById(documentId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: doc, error: dErr } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (dErr || !doc) throw new Error("Documento não encontrado.");
  const row = doc as DocumentRow;

  const { data: fileBlob, error: dlErr } = await withRetry(
    async () => supabase.storage.from(BUCKET).download(row.file_path),
    "Falha ao baixar PDF do storage",
  );
  if (dlErr || !fileBlob) throw new Error(dlErr?.message || "Não foi possível baixar o PDF.");

  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const raw_text = await extractPdfText(buffer);
  const fields = parseExtractionFromText(raw_text);
  const items = parseDocumentItems(raw_text);

  if (process.env.NODE_ENV !== "production") {
    console.log("[processDocumentById] raw_text (first 6000 chars)", raw_text.slice(0, 6000));
    console.log("[processDocumentById] parsed fields", fields);
  }

  await upsertExtraction(supabase, documentId, raw_text, fields);
  await replaceItems(supabase, documentId, items);
  await upsertCalendarEventFromExtraction(supabase, documentId, fields);

  const { error: okErr } = await supabase
    .from("documents")
    .update({
      status: "processed",
      processing_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (okErr) throw new Error(`Falha ao finalizar documento: ${okErr.message}`);
}

export async function markDocumentError(documentId: string, message: string) {
  const supabase = createServiceRoleClient();
  await supabase
    .from("documents")
    .update({
      status: "error",
      processing_error: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

export async function getDocumentWithRelations(id: string): Promise<DocumentWithRelations | null> {
  const supabase = createServiceRoleClient();
  const { data: doc, error: dErr } = await supabase.from("documents").select("*").eq("id", id).single();
  if (dErr || !doc) return null;

  const { data: ext } = await supabase.from("document_extractions").select("*").eq("document_id", id).maybeSingle();
  const { data: items } = await supabase
    .from("document_items")
    .select("*")
    .eq("document_id", id)
    .order("sort_order", { ascending: true });

  return {
    ...(doc as DocumentRow),
    extraction: ext ?? null,
    items: items ?? [],
  };
}

export async function listDocumentsForHistory(): Promise<DocumentRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as DocumentRow[];
}
