import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = typeof result.text === "string" ? result.text : "";
    return text.replace(/\r\n/g, "\n").trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
