import { AnimatedText } from "@/components/ui/animated-text";
import { PdfDocumentUpload } from "@/components/documents/pdf-document-upload";

export default function NovoPdfPage() {
  return (
    <div className="p-8">
      <AnimatedText
        text="Novo PDF"
        className="items-start justify-start"
        textClassName="text-left text-2xl font-semibold tracking-tight text-zinc-100"
      />
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        O arquivo é enviado ao Supabase, o texto é extraído e os campos principais são preenchidos
        automaticamente para demonstração.
      </p>
      <div className="mt-10 md:mt-12">
        <PdfDocumentUpload />
      </div>
    </div>
  );
}
