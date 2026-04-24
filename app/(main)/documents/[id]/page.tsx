import { notFound } from "next/navigation";

import { DocumentDetailView } from "@/components/documents/document-detail-view";
import { getDocumentWithRelations } from "@/services/document.service";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocumentWithRelations(id);
  if (!doc) notFound();
  return <DocumentDetailView doc={doc} />;
}
