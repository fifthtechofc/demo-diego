import { NextResponse } from "next/server";

import { getDocumentWithRelations, markDocumentError, processDocumentById } from "@/services/document.service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });

  try {
    await processDocumentById(id);
    const full = await getDocumentWithRelations(id);
    return NextResponse.json({ document: full });
  } catch (e) {
    console.error("[POST /api/documents/[id]/reprocess] error", e);
    const message = e instanceof Error ? e.message : "Falha ao reprocessar.";
    const details =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? { name: e.name, stack: e.stack }
        : undefined;
    await markDocumentError(id, message).catch(() => undefined);
    return NextResponse.json({ error: message, details }, { status: 500 });
  }
}

