import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // `pdfjs-dist` worker is loaded via dynamic import at runtime. Ensure Vercel/Next output tracing
  // includes these files in the serverless bundle (otherwise you'll see "fake worker failed").
  outputFileTracingIncludes: {
    "/api/documents/upload": [
      "./node_modules/pdfjs-dist/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    ],
    "/api/documents/process": [
      "./node_modules/pdfjs-dist/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    ],
    "/api/documents/[id]/reprocess": [
      "./node_modules/pdfjs-dist/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    ],
  },
};

export default nextConfig;
