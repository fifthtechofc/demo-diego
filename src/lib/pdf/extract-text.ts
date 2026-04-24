import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // `pdfjs-dist` (used by `pdf-parse`) may expect browser globals even in Node.
  // Vercel's Node runtime doesn't provide them, so we polyfill the minimum we need.
  if (typeof (globalThis as unknown as { DOMMatrix?: unknown }).DOMMatrix === "undefined") {
    const dm = await import("dommatrix");
    (globalThis as unknown as { DOMMatrix?: unknown }).DOMMatrix =
      (dm as unknown as { DOMMatrix?: unknown }).DOMMatrix ??
      (dm as unknown as { default?: unknown }).default;
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = typeof result.text === "string" ? result.text : "";
    return text.replace(/\r\n/g, "\n").trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
