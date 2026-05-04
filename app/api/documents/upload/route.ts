import { NextResponse } from "next/server";

import {
  getDocumentWithRelations,
  markDocumentError,
  uploadPdfAndCreateDocument,
} from "@/services/document.service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let documentId: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
    }

    const { id } = await uploadPdfAndCreateDocument(file);
    documentId = id;
    const full = await getDocumentWithRelations(id);
    // Processing is done via `/api/documents/process` to avoid request timeouts on batch uploads.
    return NextResponse.json({ document: full });
  } catch (e) {
    console.error("[POST /api/documents/upload] error", e);
    const message = e instanceof Error ? e.message : "Falha no processamento.";
    const details =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? { name: e.name, stack: e.stack }
        : undefined;
    if (documentId) {
      await markDocumentError(documentId, message).catch(() => undefined);
    }
    return NextResponse.json({ error: message, details }, { status: 500 });
  }
}
