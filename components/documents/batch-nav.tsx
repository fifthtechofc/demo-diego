"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

function safeSplitBatch(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BatchNav({ currentId }: { currentId: string }) {
  const sp = useSearchParams();
  const rawBatch = sp.get("batch");

  const { ids, idx } = useMemo(() => {
    const ids = safeSplitBatch(rawBatch);
    const idx = ids.indexOf(currentId);
    return { ids, idx };
  }, [rawBatch, currentId]);

  if (!rawBatch || ids.length < 2 || idx < 0) return null;

  const prev = idx > 0 ? ids[idx - 1] : null;
  const next = idx + 1 < ids.length ? ids[idx + 1] : null;
  const batchParam = encodeURIComponent(rawBatch);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        asChild
        variant="outline"
        size="sm"
        disabled={!prev}
        className="border-zinc-700/70 bg-zinc-950/30 text-zinc-100 hover:bg-zinc-900/50 hover:text-zinc-50"
      >
        {prev ? (
          <Link href={`/documents/${prev}?batch=${batchParam}`} aria-label="Documento anterior">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Link>
        ) : (
          <span>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </span>
        )}
      </Button>

      <span className="min-w-[5.5rem] text-center text-xs font-medium text-zinc-400">
        {idx + 1}/{ids.length}
      </span>

      <Button
        asChild
        variant="outline"
        size="sm"
        disabled={!next}
        className="border-zinc-700/70 bg-zinc-950/30 text-zinc-100 hover:bg-zinc-900/50 hover:text-zinc-50"
      >
        {next ? (
          <Link href={`/documents/${next}?batch=${batchParam}`} aria-label="Próximo documento">
            Próximo
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        ) : (
          <span>
            Próximo
            <ChevronRight className="ml-1 h-4 w-4" />
          </span>
        )}
      </Button>
    </div>
  );
}

