import { NextResponse } from "next/server";

import { getDocumentWithRelations, markDocumentError, processDocumentById } from "@/services/document.service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let documentId: string | null = null;
  try {
    const body = (await req.json()) as { documentId?: string };
    documentId = body.documentId ?? null;
    if (!documentId) {
      return NextResponse.json({ error: "documentId obrigatório." }, { status: 400 });
    }

    await processDocumentById(documentId);
    const full = await getDocumentWithRelations(documentId);
    return NextResponse.json({ document: full });
  } catch (e) {
    console.error("[POST /api/documents/process] error", e);
    const message = e instanceof Error ? e.message : "Falha ao reprocessar.";
    const details =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? { name: e.name, stack: e.stack }
        : undefined;
    if (documentId) await markDocumentError(documentId, message).catch(() => undefined);
    return NextResponse.json({ error: message, details }, { status: 500 });
  }
}
