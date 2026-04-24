import { NextResponse } from "next/server";

import { listDocumentsForHistory } from "@/services/document.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const documents = await listDocumentsForHistory();
    return NextResponse.json({ documents });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar documentos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
