import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseCustomerDataBlock, parseExtractionFromText } from "@/lib/extraction/parse-fields";

function main() {
  const arg = process.argv.slice(2).join(" ").trim();
  const raw =
    arg && !arg.includes("\n")
      ? readFileSync(resolve(arg), "utf8")
      : arg || "";

  if (!raw.trim()) {
    console.error(
      [
        "Usage:",
        "  node --loader ts-node/esm src/scripts/test-parse-current-pdf.ts <path-to-raw_text.txt>",
        "",
        "Or pass raw_text directly as a single argument (quoted).",
      ].join("\n"),
    );
    process.exit(1);
  }

  const customer = parseCustomerDataBlock(raw);
  const full = parseExtractionFromText(raw);

  console.log("=== raw_text (first 2500 chars) ===");
  console.log(raw.slice(0, 2500));
  console.log("\n=== customer block parsed ===");
  console.log(customer);
  console.log("\n=== full fields parsed ===");
  console.log(full);
}

main();

