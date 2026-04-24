import type { ParsedDocumentItem, ParsedExtractionFields } from "@/types/document";

const NORM = (s: string) => s.replace(/\s+/g, " ").trim();

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Lowercase ASCII-ish key for matching Portuguese labels. */
function normLabelKey(s: string): string {
  return stripAccents(s)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .trim();
}

function lineAfterLabel(text: string, labelRegex: RegExp): string | null {
  const m = text.match(labelRegex);
  if (!m || m.index === undefined) return null;
  const rest = text.slice(m.index + m[0].length);
  const line = rest.split(/\n/)[0];
  const v = NORM(line.replace(/^[:.\-\s]+/, ""));
  return v.length ? v : null;
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  if (!m?.[1]) return null;
  const v = NORM(m[1]);
  return v.length ? v : null;
}

function pickLabeled(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const v = lineAfterLabel(text, p);
    if (v) return v;
  }
  return null;
}

interface LabeledPair {
  key: string;
  rawLabel: string;
  value: string;
}

/** Looks like "64 - ASSEFAZ" (código + nome do plano), not a person's name. */
function looksLikeHealthPlanCode(v: string): boolean {
  return /^\d{1,4}\s*[-–]\s*[A-Za-zÀ-ÿ]{2,}/.test(v.trim());
}

function looksLikeCpf(v: string): boolean {
  const t = v.trim();
  return /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(t);
}

function looksLikeCnpj(v: string): boolean {
  const t = v.trim();
  return /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(t);
}

function looksLikeCep(v: string): boolean {
  const t = v.trim();
  // Aceita "01308-756", "01308756" e também variações com ponto "013.087-567" (como no PDF).
  return /^\d{5}-?\d{3}$/.test(t) || /^\d{3}\.?\d{3}-?\d{3}$/.test(t);
}

function looksLikeDoctorName(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  if (looksLikeHealthPlanCode(t)) return false;
  if (looksLikeCpf(t)) return false;
  // Médico neste template vem normalmente com "DR/DRA" ou "CRM".
  // Não aceitar qualquer string com letras, senão confunde paciente como médico.
  return /\bdr\.?\b/i.test(t) || /\bdra\.?\b/i.test(t) || /\bcrm\b/i.test(t);
}

function looksLikePersonName(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  if (looksLikeHealthPlanCode(t)) return false;
  if (looksLikeCpf(t)) return false;
  if (t.length < 4) return false;
  if ((t.match(/\d/g) ?? []).length >= 3) return false;
  return /[A-Za-zÀ-ÿ]{2,}/.test(t);
}

function looksLikeStandaloneLabelLine(line: string): boolean {
  const t = NORM(line);
  if (!t) return false;
  // "Médico:" / "Paciente:" / "Endereço:" etc
  return /^.{1,45}:\s*$/.test(t);
}

function isLikelyTemplateLabelLine(line: string): boolean {
  const t = NORM(line);
  if (!t) return false;
  const left = t.includes(":") ? t.split(":")[0] : t;
  const key = normLabelKey(left);
  return INLINE_FIELD_LABELS.has(key);
}

function valueAfterTemplateLabel(text: string, labels: string[]): string | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const labelRe = new RegExp(`^\\s*(?:${labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*:\\s*(.*)\\s*$`, "i");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const m = raw.match(labelRe);
    if (!m) continue;
    const sameLine = NORM(m[1] ?? "");
    // Se "valor" na mesma linha parece outro rótulo, ignora.
    if (sameLine && !isLikelyTemplateLabelLine(sameLine) && !looksLikeStandaloneLabelLine(sameLine)) return sameLine;

    // If value is on next line, pick the next non-empty line that doesn't look like a new label.
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const cand = NORM(lines[j] ?? "");
      if (!cand) continue;
      if (looksLikeStandaloneLabelLine(cand) || isLikelyTemplateLabelLine(cand)) break;
      if (/^.{1,42}:\s*\S/.test(cand)) break; // another labeled field
      return cand;
    }
  }
  return null;
}

function valueBelowTemplateLabel(text: string, labels: string[]): string | null {
  // Template rule: value is always on the line below the label.
  // PDFs às vezes perdem ":" ou mudam espaçamento; então comparamos por chave normalizada.
  const expected = new Set(labels.map((l) => normLabelKey(l)));
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const labelKeyFromLine = (line: string): string => {
    const t = NORM(line);
    const left = t.includes(":") ? t.split(":")[0] : t;
    return normLabelKey(left);
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (!expected.has(labelKeyFromLine(raw))) continue;

    for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
      const cand = NORM(lines[j] ?? "");
      if (!cand) continue;
      if (looksLikeStandaloneLabelLine(cand) || isLikelyTemplateLabelLine(cand)) break;
      if (/^.{1,42}:\s*\S/.test(cand)) break;
      return cand;
    }
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fallback robusto para PDFs em colunas: captura o valor "entre rótulos", sem depender de newline.
 * Ex.: "Cliente/Hospital: XYZ Endereço: RUA ..." => captura XYZ
 */
function valueBetweenLabels(text: string, startLabels: string[], stopLabels: string[]): string | null {
  const start = startLabels.map(escapeRe).join("|");
  const stop = stopLabels.map(escapeRe).join("|");
  const re = new RegExp(
    String.raw`(?:^|[\s\n])(?:${start})[^\S\r\n]*:?[^\S\r\n]*([\s\S]{1,220}?)(?=(?:\n|\s{2,}|\s)(?:${stop})[^\S\r\n]*:|$)`,
    "i",
  );
  const m = text.match(re);
  if (!m?.[1]) return null;
  const v = NORM(m[1])
    // corta se ainda sobrou algo tipo "Bairro:" colado
    .replace(/\b(?:Bairro|Telefone|Fax)\b[^\S\r\n]*:.*$/i, "")
    .trim();
  if (!v) return null;
  // evita devolver outro rótulo como valor
  if (isLikelyTemplateLabelLine(v) || looksLikeStandaloneLabelLine(v)) return null;
  return v;
}

/** Orçamento / metadado no começo da linha "Cirurgia". */
function looksLikeBudgetOrMetaCirurgia(v: string): boolean {
  const t = v.trim();
  return /^\d{1,3}[.,]\d{3}\b/.test(t) || /^\d{1,3}[.,]\d{3}\s*[-–]\s*\d{1,2}\/\d{1,2}/.test(t);
}

/** Rótulos comuns em formulários — evita partir títulos tipo "Cirurgia: A: B" em falsos pares. */
const INLINE_FIELD_LABELS = new Set(
  [
    "medico",
    "plano de saude",
    "plano",
    "paciente",
    "cpf",
    "cnpj",
    "cidade",
    "uf",
    "estado",
    "convenio",
    "endereco",
    "bairro",
    "telefone",
    "fax",
    "cliente/hospital",
    "hospital",
    "data da cirurgia",
    "data do procedimento",
    "data cirurgica",
    "solicitante",
    "representante",
    "solicitado via",
    "materiais",
    "observacoes",
  ].map(normLabelKey),
);

function isWhitelistedInlineLabel(key: string): boolean {
  if (INLINE_FIELD_LABELS.has(key)) return true;
  if (key.startsWith("plano ")) return true;
  return false;
}

/**
 * Quando o PDF junta colunas numa única linha ("Médico: X Plano de saúde: Y Paciente: Z"),
 * extrai pares usando as posições dos ":" (só se todos os rótulos forem de campos conhecidos).
 */
function splitInlineLabeledSegments(line: string): LabeledPair[] | null {
  const labelRe = /\b([A-Za-zÀ-ú][A-Za-zÀ-ú0-9\s./()\-]{1,45}?)\s*:\s*/g;
  const matches = [...line.matchAll(labelRe)];
  if (matches.length < 2) return null;

  const out: LabeledPair[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const valueStart = m.index! + m[0].length;
    const valueEnd = i + 1 < matches.length ? matches[i + 1].index! : line.length;
    const rawLabel = NORM(m[1]!);
    const value = NORM(line.slice(valueStart, valueEnd));
    if (rawLabel && value) out.push({ key: normLabelKey(rawLabel), rawLabel, value });
  }
  if (out.length < 2) return null;
  if (!out.every((p) => isWhitelistedInlineLabel(p.key))) return null;
  return out;
}

function collectLabeledPairs(text: string): LabeledPair[] {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const lines = rawLines.map((l) => NORM(l)).filter(Boolean);
  const out: LabeledPair[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colon = line.indexOf(":");
    if (colon <= 0 || colon > 80) continue;

    const inline = splitInlineLabeledSegments(line);
    if (inline) {
      out.push(...inline);
      continue;
    }

    const rawLabel = NORM(line.slice(0, colon));
    let value = NORM(line.slice(colon + 1));
    const key = normLabelKey(rawLabel);

    // Evita falsos positivos (ex.: URLs).
    if (/^https?$/i.test(rawLabel)) continue;

    if (!value && i + 1 < lines.length) {
      const next = lines[i + 1];
      const nextHasEarlyLabel = /^.{1,42}:\s+\S/.test(next);
      // Se a próxima linha parece um novo rótulo (mesmo sem valor), não "gruda" como valor.
      const nextLooksLikeLabelEvenIfEmpty = /^.{1,42}:\s*$/.test(next);
      if (next && !nextHasEarlyLabel && !nextLooksLikeLabelEvenIfEmpty) {
        value = next;
        i += 1;
      }
    }

    if (!rawLabel) continue;
    out.push({ key, rawLabel, value });
  }

  return out;
}

function allValuesForKey(pairs: LabeledPair[], predicate: (key: string) => boolean): string[] {
  return pairs.filter((p) => predicate(p.key)).map((p) => p.value).filter(Boolean);
}

function firstValueForKey(pairs: LabeledPair[], predicate: (key: string) => boolean): string | null {
  const vs = allValuesForKey(pairs, predicate);
  return vs[0] ?? null;
}

function pickHospitalFromPairs(pairs: LabeledPair[]): string | null {
  const prefer = firstValueForKey(
    pairs,
    (k) =>
      k === "cliente/hospital" ||
      k.includes("cliente/hospital") ||
      (k.includes("hospital") && !k.includes("endereco") && !k.includes("telefone")),
  );
  if (prefer) return prefer;
  return firstValueForKey(pairs, (k) => k === "hospital" || k.endsWith(" hospital"));
}

// Note: pickPatientFromPairs/pickInsuranceFromPairs were previously used for heuristic extraction.
// We now prefer the fixed-template label extraction in `parseExtractionFromText`.

function pickSurgeryNameFromPairs(pairs: LabeledPair[], fullText: string): string | null {
  const values = allValuesForKey(pairs, (k) => k === "cirurgia" || k.startsWith("cirurgia "));
  const good = values.filter((v) => v && !looksLikeBudgetOrMetaCirurgia(v));
  if (good.length) {
    good.sort((a, b) => b.length - a.length);
    return good[0] ?? null;
  }
  if (values.length) return values.sort((a, b) => b.length - a.length)[0] ?? null;

  return (
    pickLabeled(fullText, [
      /Cirurgia\s*[:\-]/i,
      /Procedimento\s*[:\-]/i,
      /Nome\s+da\s+cirurgia\s*[:\-]/i,
    ]) ?? firstMatch(fullText, /(?:Cirurgia|Procedimento)[:\s]+([^\n]{2,160})/i)
  );
}

function pickSurgeryDateFromPairs(pairs: LabeledPair[], fullText: string): string | null {
  const labeled =
    firstValueForKey(pairs, (k) => k.includes("data") && k.includes("cirurgia")) ??
    firstValueForKey(pairs, (k) => k.includes("data") && k.includes("procedimento")) ??
    firstValueForKey(pairs, (k) => k.includes("data") && k.includes("cirurgica"));

  const extractDate = (s: string): string | null => {
    const t = NORM(s);
    if (!t) return null;
    // dd/mm/yyyy - hh:mm (aceita ano 2 ou 4 dígitos)
    const dmyTime = t.match(
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s*[-–]\s*(\d{1,2}:\d{2}))?\b/,
    );
    if (dmyTime?.[1]) {
      const d = dmyTime[1];
      const time = dmyTime[2];
      return time ? `${d} - ${time}` : d;
    }
    // yyyy-mm-dd
    const ymd = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (ymd?.[1]) return ymd[1];
    return null;
  };

  if (labeled) return extractDate(labeled);

  const fromText =
    pickLabeled(fullText, [
      /Data\s+da\s+cirurgia\s*[:\-]/i,
      /Data\s+do\s+procedimento\s*[:\-]/i,
      /Data\s+cir[uú]rgica\s*[:\-]/i,
    ]) ?? null;

  if (fromText) return extractDate(fromText);

  // Não usar a primeira data do PDF (costuma ser "Data" da solicitação).
  return null;
}

// Note: pickDoctorFromPairs was previously used for heuristic extraction.
// We now prefer the fixed-template label extraction in `parseExtractionFromText`.

function pickCityFromPairs(pairs: LabeledPair[]): string | null {
  const combined = firstValueForKey(pairs, (k) => k.includes("cidade") && k.includes("uf"));
  if (combined) {
    const parts = combined.split(/\s*[-\/,]\s*|\s+-\s+/);
    if (parts.length >= 2) return NORM(parts[0]) || null;
    return combined;
  }
  return firstValueForKey(pairs, (k) => k === "cidade" || k.startsWith("cidade "));
}

function pickStateFromPairs(pairs: LabeledPair[]): string | null {
  const combined = firstValueForKey(pairs, (k) => k.includes("cidade") && k.includes("uf"));
  if (combined) {
    const parts = combined.split(/\s*[-\/,]\s*|\s+-\s+/);
    if (parts.length >= 2) return NORM(parts[parts.length - 1]) || null;
  }
  const uf = firstValueForKey(pairs, (k) => k === "uf" || k === "estado");
  if (uf && /^[A-Z]{2}$/i.test(uf.trim())) return uf.trim().toUpperCase();
  return null;
}

function isGarbageValue(v: string): boolean {
  const t = NORM(v);
  if (!t) return true;
  if (t === "_" || t === "-" || t === "—") return true;
  if (/^_+$/.test(t)) return true;
  return false;
}

function looksLikeHospitalName(v: string): boolean {
  const t = NORM(v);
  if (!t || isGarbageValue(t)) return false;
  if (isLikelyTemplateLabelLine(t)) return false;
  const up = t.toUpperCase();
  if (/\b(CNPJ|CEP|UF|CIDADE|ENDERECO|ENDEREÇO|BAIRRO|TELEFONE|FAX)\b/.test(up)) return false;
  if (/\b(HOSPITAL|CLINICA|CLÍNICA|CENTRO|AMIL)\b/.test(up)) return true;
  const letters = (t.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  return letters >= 8 && t === up;
}

function looksLikeAddress(v: string): boolean {
  const t = NORM(v);
  if (!t || isGarbageValue(t)) return false;
  if (isLikelyTemplateLabelLine(t)) return false;
  const up = t.toUpperCase();
  if (/\b(CNPJ|CEP|UF|CIDADE|BAIRRO|TELEFONE|FAX)\b/.test(up)) return false;
  if (/\d{1,6}\b/.test(t)) return true;
  return /\b(RUA|AVENIDA|AV\.?|ALAMEDA|ESTRADA|RODOVIA|PRA[CÇ]A|TRAVESSA|JOSE|JOS[EÉ])\b/i.test(t);
}

function looksLikeCity(v: string): boolean {
  const t = NORM(v);
  if (!t || isGarbageValue(t)) return false;
  if (isLikelyTemplateLabelLine(t)) return false;
  if (looksLikeCep(t) || looksLikeCnpj(t)) return false;
  if (/^[A-Z]{2}$/.test(t.trim())) return false;
  if (/\d/.test(t)) return false;
  return t.length >= 3 && t.length <= 40;
}

function isHeaderLikeLine(v: string): boolean {
  const t = NORM(v);
  if (!t) return false;
  const k = normLabelKey(t);
  return (
    k.includes("dados do cliente") ||
    k.includes("solicitacao") ||
    k.includes("observacoes") ||
    k === "solicitado via" ||
    k === "solicitante"
  );
}

function looksLikePhone(v: string): boolean {
  const t = NORM(v);
  if (!t || isGarbageValue(t)) return false;
  return /(\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/.test(t);
}

function normalizeUf(v: string): string | null {
  const t = NORM(v).toUpperCase();
  return /^[A-Z]{2}$/.test(t) ? t : null;
}

function extractCepFromText(v: string): string | null {
  const t = NORM(v);
  const m = t.match(/\b(\d{5}-?\d{3}|\d{3}\.?\d{3}-?\d{3})\b/);
  return m?.[1] ? m[1] : null;
}

function extractCnpjFromText(v: string): string | null {
  const t = NORM(v);
  const m = t.match(/\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/);
  return m?.[1] ? m[1] : null;
}

function normalizeSurgeryDateForDb(v: string): string | null {
  const t = NORM(v);
  if (!t || isGarbageValue(t)) return null;

  // dd/mm/yy - hh:mm  OR dd/mm/yyyy - hh:mm  OR dd/mm/yy
  const m = t.match(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s*[-–]\s*(\d{1,2}):(\d{2}))?\b/,
  );
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yy = String(m[3]);
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    const hh = m[4] ? String(m[4]).padStart(2, "0") : null;
    const min = m[5] ? String(m[5]).padStart(2, "0") : null;
    return hh && min ? `${yyyy}-${mm}-${dd} ${hh}:${min}` : `${yyyy}-${mm}-${dd}`;
  }

  // already ISO-ish
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?\b/);
  if (iso?.[1]) return iso[2] ? `${iso[1]} ${iso[2]}` : iso[1];

  return null;
}

function parseEventDatetimesFromSurgeryDate(surgeryDate: string | null): {
  event_start_at: string | null;
  event_end_at: string | null;
  event_timezone: string | null;
  event_datetime_raw: string | null;
} {
  if (!surgeryDate) {
    return { event_start_at: null, event_end_at: null, event_timezone: null, event_datetime_raw: null };
  }

  const raw = NORM(surgeryDate);
  if (!raw || isGarbageValue(raw)) {
    return { event_start_at: null, event_end_at: null, event_timezone: null, event_datetime_raw: null };
  }

  // Expected: "YYYY-MM-DD" or "YYYY-MM-DD HH:MM"
  const m = raw.match(/\b(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2}))?\b/);
  if (!m?.[1]) {
    return { event_start_at: null, event_end_at: null, event_timezone: null, event_datetime_raw: raw };
  }

  const date = m[1];
  const hh = m[2];
  const mm = m[3];

  // São Paulo timezone (business default)
  const event_timezone = "America/Sao_Paulo";

  const startLocal = hh && mm ? `${date}T${hh}:${mm}:00` : `${date}T00:00:00`;
  const start = new Date(`${startLocal}-03:00`);

  if (hh && mm) {
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return {
      event_start_at: start.toISOString(),
      event_end_at: end.toISOString(),
      event_timezone,
      event_datetime_raw: raw,
    };
  }

  return {
    event_start_at: start.toISOString(),
    event_end_at: null,
    event_timezone,
    event_datetime_raw: raw,
  };
}

export function parseCustomerDataBlock(rawText: string): {
  hospital_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  cnpj?: string | null;
  bairro?: string | null;
  telefone?: string | null;
} {
  const text = rawText.replace(/\r\n/g, "\n");
  const lines = text.split("\n").map((l) => NORM(l));

  const startIdxHeader = lines.findIndex((l) => normLabelKey(l).includes("dados do cliente"));
  const startIdxLabel =
    startIdxHeader >= 0
      ? startIdxHeader
      : lines.findIndex((l) => {
          const left = l.includes(":") ? l.split(":")[0]! : l;
          const k = normLabelKey(left);
          return k === "cliente/hospital" || k === "hospital";
        });

  const startIdx = startIdxLabel >= 0 ? startIdxLabel : 0;
  const stopKeys = [
    "medico",
    "plano de saude",
    "data da cirurgia",
    "solicitacao",
    "solicitac",
    "observacoes",
    "observac",
  ].map(normLabelKey);

  const endIdx =
    (() => {
        for (let i = startIdx + 1; i < lines.length; i++) {
            const k = normLabelKey(lines[i] ?? "");
            if (stopKeys.some((s) => k.includes(s))) return i;
          }
          return lines.length;
      })();

  const blockLines = lines.slice(startIdx, endIdx).filter(Boolean);
  const blockText = blockLines.join("\n");

  const out: {
    hospital_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    cnpj?: string | null;
    bairro?: string | null;
    telefone?: string | null;
  } = {};

  const direct = (labels: string[]) =>
    valueAfterTemplateLabel(blockText, labels) ?? valueBelowTemplateLabel(blockText, labels) ?? null;

  if (process.env.NODE_ENV !== "production") {
    console.log("[parseCustomerDataBlock] startIdx", startIdx);
    console.log("[parseCustomerDataBlock] endIdx", endIdx);
    console.log("[parseCustomerDataBlock] blockLines", blockLines.slice(0, 160));
  }

  const h1 = direct(["Cliente/Hospital", "Cliente", "Hospital"]);
  if (h1 && looksLikeHospitalName(h1)) out.hospital_name = h1;

  const a1 = direct(["Endereço", "Endereco"]);
  if (a1 && looksLikeAddress(a1)) out.address = a1;

  const c1 = direct(["Cidade"]);
  if (c1 && looksLikeCity(c1)) out.city = c1;

  const uf1 = direct(["UF", "Estado"]);
  if (uf1) out.state = normalizeUf(uf1);

  const cep1 = direct(["CEP"]);
  if (cep1) out.cep = extractCepFromText(cep1);

  const cnpj1 = direct(["CNPJ"]);
  if (cnpj1) out.cnpj = extractCnpjFromText(cnpj1);

  const b1 = direct(["Bairro"]);
  // Bairro não pode ser hospital/endereço/UF/CEP/CNPJ.
  if (b1 && looksLikeCity(b1) && !looksLikeAddress(b1) && !looksLikeHospitalName(b1)) out.bairro = b1;

  const t1 = direct(["Telefone"]);
  if (t1 && looksLikePhone(t1)) out.telefone = t1;

  const customerLabelKeys = new Set([
    "cliente/hospital",
    "hospital",
    "endereco",
    "cidade",
    "uf",
    "estado",
    "cep",
    "cnpj",
    "bairro",
    "telefone",
  ]);

  const labelOnlyStart = blockLines.findIndex((l) => {
    const left = l.includes(":") ? l.split(":")[0]! : l;
    const k = normLabelKey(left);
    if (!customerLabelKeys.has(k)) return false;
    const after = l.includes(":") ? NORM(l.split(":").slice(1).join(":")) : "";
    return !after || isLikelyTemplateLabelLine(after) || looksLikeStandaloneLabelLine(after);
  });

  if (labelOnlyStart >= 0) {
    const seqLabels: string[] = [];
    let i = labelOnlyStart;
    for (; i < blockLines.length; i++) {
      const line = blockLines[i]!;
      const left = (line.includes(":") ? line.split(":")[0] : line) ?? "";
      const k = normLabelKey(left);
      if (!customerLabelKeys.has(k)) break;
      const after = line.includes(":") ? NORM(line.split(":").slice(1).join(":")) : "";
      if (after && !isLikelyTemplateLabelLine(after) && !looksLikeStandaloneLabelLine(after)) break;
      seqLabels.push(k);
    }

    if (seqLabels.length >= 4) {
      const values: string[] = [];
      for (let j = i; j < blockLines.length; j++) {
        const v = blockLines[j]!;
        if (!v || isGarbageValue(v)) continue;
        if (isLikelyTemplateLabelLine(v) || looksLikeStandaloneLabelLine(v)) continue;
        if (isHeaderLikeLine(v)) continue;
        values.push(v);
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[parseCustomerDataBlock] startIdx", startIdx);
        console.log("[parseCustomerDataBlock] endIdx", endIdx);
        console.log("[parseCustomerDataBlock] blockText (first 2500 chars)", blockText.slice(0, 2500));
        console.log("[parseCustomerDataBlock] blockLines", blockLines.slice(0, 120));
        console.log("[parseCustomerDataBlock] seqLabels", seqLabels);
        console.log("[parseCustomerDataBlock] candidates(values)", values.slice(0, 80));
      }

      const pluck = <T>(pred: (s: string) => T | null): T | null => {
        const idx = values.findIndex((x) => pred(x) !== null);
        if (idx < 0) return null;
        const v = values[idx]!;
        values.splice(idx, 1);
        return pred(v);
      };

      // Regra explícita do modelo (prioridade): tenta achar os tipados primeiro,
      // depois textual forte para hospital/endereço/cidade e por fim bairro.
      out.cnpj = out.cnpj ?? pluck((x) => extractCnpjFromText(x));
      out.state = out.state ?? pluck((x) => normalizeUf(x));
      out.cep = out.cep ?? pluck((x) => extractCepFromText(x));
      out.telefone = out.telefone ?? pluck((x) => (looksLikePhone(x) ? x : null));

      if (!out.hospital_name) {
        const idx = values.findIndex((x) => looksLikeHospitalName(x));
        if (idx >= 0) out.hospital_name = values.splice(idx, 1)[0]!;
      }
      if (!out.address) {
        const idx = values.findIndex((x) => looksLikeAddress(x));
        if (idx >= 0) out.address = values.splice(idx, 1)[0]!;
      }
      if (!out.city) {
        const idx = values.findIndex((x) => looksLikeCity(x));
        if (idx >= 0) out.city = values.splice(idx, 1)[0]!;
      }
      if (!out.bairro) {
        // Se existir "Bairro:" no bloco, prefere o valor logo após (quando estiver entre candidatos)
        const idx = values.findIndex((x) => looksLikeCity(x) && !looksLikeAddress(x));
        if (idx >= 0) out.bairro = values.splice(idx, 1)[0]!;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[parseCustomerDataBlock] customerData final", out);
      }
    }
  }

  // Regra explícita do modelo (com base no raw_text real):
  // Quando existe "Dados do cliente" e "Bairro:" e logo abaixo vêm, nessa ordem:
  //   HOSPITAL, ENDEREÇO, CIDADE, BAIRRO
  // então mapeia por posição até encontrar "CEP:" ou outro rótulo.
  const idxDados = blockLines.findIndex((l) => normLabelKey(l).includes("dados do cliente"));
  const idxBairroLabel = blockLines.findIndex((l) => normLabelKey((l.includes(":") ? l.split(":")[0]! : l)) === "bairro");
  if (idxBairroLabel >= 0 && idxDados >= 0 && idxBairroLabel >= idxDados) {
    const seq: string[] = [];
    for (let i = idxBairroLabel + 1; i < blockLines.length; i++) {
      const v = blockLines[i]!;
      if (!v || isGarbageValue(v)) continue;
      if (isLikelyTemplateLabelLine(v) || looksLikeStandaloneLabelLine(v)) break;
      if (isHeaderLikeLine(v)) continue;
      seq.push(v);
      if (seq.length >= 6) break;
    }

    const h = seq.find((x) => looksLikeHospitalName(x)) ?? null;
    if (!out.hospital_name && h) out.hospital_name = h;

    // remove o hospital para facilitar as próximas escolhas
    const rest = seq.filter((x) => x !== h);

    const addr = rest.find((x) => looksLikeAddress(x)) ?? null;
    if (!out.address && addr) out.address = addr;

    const rest2 = rest.filter((x) => x !== addr);

    const city = rest2.find((x) => looksLikeCity(x)) ?? null;
    if (!out.city && city) out.city = city;

    const rest3 = rest2.filter((x) => x !== city);

    // o bairro tende a ser o próximo textual em caixa alta, sem dígitos
    const bairro = rest3.find((x) => looksLikeCity(x) && !looksLikeHospitalName(x) && !looksLikeAddress(x)) ?? null;
    if (!out.bairro && bairro) out.bairro = bairro;

    if (process.env.NODE_ENV !== "production") {
      console.log("[parseCustomerDataBlock] explicit Bairro-block seq", seq);
      console.log("[parseCustomerDataBlock] explicit mapped", {
        hospital_name: out.hospital_name,
        address: out.address,
        city: out.city,
        bairro: out.bairro,
      });
    }
  }

  if (out.hospital_name && !looksLikeHospitalName(out.hospital_name)) out.hospital_name = null;
  if (out.address && !looksLikeAddress(out.address)) out.address = null;
  if (out.city && !looksLikeCity(out.city)) out.city = null;
  if (out.state) out.state = normalizeUf(out.state);
  if (out.cep) out.cep = extractCepFromText(out.cep);
  if (out.cnpj) out.cnpj = extractCnpjFromText(out.cnpj);
  if (out.bairro && isLikelyTemplateLabelLine(out.bairro)) out.bairro = null;
  if (out.telefone && !looksLikePhone(out.telefone)) out.telefone = null;

  return out;
}

export function parseMedicalPatientBlock(rawText: string): {
  doctor_name?: string | null;
  patient_name?: string | null;
  insurance_name?: string | null;
  surgery_date?: string | null;
  cpf?: string | null;
  surgery_name?: string | null;
} {
  const text = rawText.replace(/\r\n/g, "\n");
  const lines = text.split("\n").map((l) => NORM(l)).filter(Boolean);

  // delimita bloco a partir de "Médico" ou "Cirurgia" e para em "Solicitação"/"Observações"
  const startIdx =
    lines.findIndex((l) => normLabelKey(l).startsWith("medico")) >= 0
      ? lines.findIndex((l) => normLabelKey(l).startsWith("medico"))
      : Math.max(0, lines.findIndex((l) => normLabelKey(l).startsWith("cirurgia")));

  const stopKeys = ["solicitacao", "solicitac", "observacoes", "observac"].map(normLabelKey);
  const endIdx = (() => {
    for (let i = Math.max(0, startIdx); i < lines.length; i++) {
      const k = normLabelKey(lines[i] ?? "");
      if (stopKeys.some((s) => k.includes(s))) return i;
    }
    return lines.length;
  })();

  const block = lines.slice(Math.max(0, startIdx), endIdx);
  const blockText = block.join("\n");

  const out: {
    doctor_name?: string | null;
    patient_name?: string | null;
    insurance_name?: string | null;
    surgery_date?: string | null;
    cpf?: string | null;
    surgery_name?: string | null;
  } = {};

  // Direto por label quando vier na mesma linha
  const direct = (labels: string[]) =>
    valueAfterTemplateLabel(blockText, labels) ?? valueBelowTemplateLabel(blockText, labels) ?? null;

  // Cirurgia costuma vir bem: "Cirurgia: ..."
  const surgery = direct(["Cirurgia", "Procedimento"]);
  if (surgery && !looksLikeBudgetOrMetaCirurgia(surgery)) out.surgery_name = surgery;

  // Plano (no raw_text atual, vem na linha logo após "Paciente:" e parece "64 - ASSEFAZ")
  const plan = direct(["Plano de saúde", "Plano de saude", "Convênio", "Convenio"]);
  if (plan && looksLikeHealthPlanCode(plan)) out.insurance_name = plan;

  // CPF pode vir depois do label ou na linha anterior (como no raw_text atual)
  const cpfAfter = direct(["CPF"]);
  const cpfAny =
    (cpfAfter && looksLikeCpf(cpfAfter) ? cpfAfter : null) ??
    firstMatch(blockText, CPF_RE) ??
    firstMatch(blockText, CPF_DIGITS_RE);
  if (cpfAny && looksLikeCpf(cpfAny)) out.cpf = cpfAny;

  // Data da cirurgia: no raw_text atual, a data/hora vem ANTES do rótulo "Data da cirurgia:"
  // então pegamos a primeira data/hora próxima do rótulo.
  const idxDataLabel = block.findIndex((l) => normLabelKey(l).startsWith("data da cirurgia"));
  if (idxDataLabel >= 0) {
    const neighborhood = block
      .slice(Math.max(0, idxDataLabel - 3), Math.min(block.length, idxDataLabel + 4))
      .join(" ");
    const m = neighborhood.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})(?:\s*[-–]\s*(\d{1,2}:\d{2}))?\b/);
    if (m?.[1]) out.surgery_date = normalizeSurgeryDateForDb(m[2] ? `${m[1]} - ${m[2]}` : m[1]);
  } else {
    const m = blockText.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})(?:\s*[-–]\s*(\d{1,2}:\d{2}))?\b/);
    if (m?.[1]) out.surgery_date = normalizeSurgeryDateForDb(m[2] ? `${m[1]} - ${m[2]}` : m[1]);
  }

  // Regra explícita do modelo (com base no raw_text real):
  // Depois de "Cirurgia: ..." vêm duas linhas de nome:
  //   1) médico ("DR ...")
  //   2) paciente (nome em caixa alta)
  const idxCir = block.findIndex((l) => normLabelKey(l).startsWith("cirurgia"));
  const candidates: string[] = [];
  if (idxCir >= 0) {
    for (let i = idxCir + 1; i < Math.min(block.length, idxCir + 10); i++) {
      const v = block[i]!;
      if (!v || isGarbageValue(v)) continue;
      if (isLikelyTemplateLabelLine(v) || looksLikeStandaloneLabelLine(v)) break;
      if (isHeaderLikeLine(v)) continue;
      // para no início de outro bloco conhecido
      const k = normLabelKey(v.includes(":") ? v.split(":")[0]! : v);
      if (k.includes("data de nascimento") || k === "cpf") break;
      candidates.push(v);
      if (candidates.length >= 6) break;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[parseMedicalPatientBlock] startIdx", startIdx);
    console.log("[parseMedicalPatientBlock] endIdx", endIdx);
    console.log("[parseMedicalPatientBlock] block (first 120)", block.slice(0, 120));
    console.log("[parseMedicalPatientBlock] candidates(after cirurgia)", candidates);
  }

  if (!out.doctor_name) {
    const doc = candidates.find((x) => looksLikeDoctorName(x)) ?? null;
    if (doc) out.doctor_name = doc;
  }
  if (!out.patient_name) {
    const remaining = candidates.filter((x) => x !== out.doctor_name);
    const pat =
      remaining.find((x) => looksLikePersonName(x) && !looksLikeDoctorName(x) && !looksLikeHealthPlanCode(x)) ??
      null;
    if (pat) out.patient_name = pat;
  }

  // Plano: às vezes vem logo após "Paciente:" e ANTES de "Cirurgia:"
  if (!out.insurance_name) {
    const idxPacLabel = block.findIndex((l) => normLabelKey(l).startsWith("paciente"));
    if (idxPacLabel >= 0) {
      const neigh = block.slice(idxPacLabel, Math.min(block.length, idxPacLabel + 6));
      const plan2 = neigh.find((x) => looksLikeHealthPlanCode(x)) ?? null;
      if (plan2) out.insurance_name = plan2;
    }
  }

  // limpeza final
  if (out.doctor_name && !looksLikeDoctorName(out.doctor_name)) out.doctor_name = null;
  if (out.patient_name && !looksLikePersonName(out.patient_name)) out.patient_name = null;
  if (out.insurance_name && !looksLikeHealthPlanCode(out.insurance_name)) out.insurance_name = null;
  if (out.cpf && !looksLikeCpf(out.cpf)) out.cpf = null;
  if (out.surgery_name && looksLikeBudgetOrMetaCirurgia(out.surgery_name)) out.surgery_name = null;
  if (out.surgery_date) out.surgery_date = normalizeSurgeryDateForDb(out.surgery_date);

  if (process.env.NODE_ENV !== "production") {
    console.log("[parseMedicalPatientBlock] final", out);
  }

  return out;
}

const CNPJ_RE = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
const CNPJ_DIGITS_RE = /\b(\d{14})\b/;
const CPF_RE = /\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/;
const CPF_DIGITS_RE = /\b(\d{11})\b/;

export function emptyExtractionFields(): ParsedExtractionFields {
  return {
    patient_name: null,
    surgery_name: null,
    hospital_name: null,
    address: null,
    doctor_name: null,
    insurance_name: null,
    surgery_date: null,
    city: null,
    state: null,
    cep: null,
    cnpj: null,
    cpf: null,
    bairro: null,
    telefone: null,
    representative: null,
    requester: null,
    requester_channel: null,
    event_start_at: null,
    event_end_at: null,
    event_timezone: null,
    event_datetime_raw: null,
  };
}

export function parseExtractionFromText(raw: string): ParsedExtractionFields {
  const text = raw.replace(/\r\n/g, "\n");
  const out = emptyExtractionFields();
  const pairs = collectLabeledPairs(text);

  const customer = parseCustomerDataBlock(text);
  const mp = parseMedicalPatientBlock(text);

  // Campo 1: DADOS DO CLIENTE
  out.hospital_name =
    customer.hospital_name ??
    valueBelowTemplateLabel(text, ["Cliente/Hospital", "Cliente", "Hospital"]) ??
    valueAfterTemplateLabel(text, ["Cliente/Hospital", "Cliente", "Hospital"]) ??
    // Não atravessar newline ao pegar valor após o rótulo
    firstMatch(text, /Cliente\/Hospital[^\S\r\n]*:?[^\S\r\n]*([^\n]{2,160})/i) ??
    valueBetweenLabels(
      text,
      ["Cliente/Hospital", "Cliente", "Hospital"],
      ["Endereço", "Endereco", "Cidade", "UF", "CEP", "CNPJ", "Bairro", "Telefone", "Fax"],
    ) ??
    pickHospitalFromPairs(pairs);

  const tmplCnpj = customer.cnpj ??
    valueBelowTemplateLabel(text, ["CNPJ"]) ??
    valueAfterTemplateLabel(text, ["CNPJ"]) ??
    firstMatch(text, /CNPJ[^\S\r\n]*:?[^\S\r\n]*([0-9.\-/]{8,30})/i) ??
    valueBetweenLabels(text, ["CNPJ"], ["Endereço", "Endereco", "Cidade", "UF", "CEP", "Bairro", "Telefone", "Fax"]);
  const anyCnpj = tmplCnpj ?? firstMatch(text, CNPJ_RE) ?? firstMatch(text, CNPJ_DIGITS_RE);
  if (anyCnpj && looksLikeCnpj(anyCnpj)) out.cnpj = anyCnpj;

  const tmplAddress = customer.address ??
    valueBelowTemplateLabel(text, ["Endereço", "Endereco"]) ??
    valueAfterTemplateLabel(text, ["Endereço", "Endereco"]) ??
    firstMatch(text, /Endere[cç]o[^\S\r\n]*:?[^\S\r\n]*([^\n]{4,200})/i) ??
    valueBetweenLabels(text, ["Endereço", "Endereco"], ["Cidade", "UF", "CEP", "CNPJ", "Bairro", "Telefone", "Fax"]);
  if (tmplAddress && !looksLikeStandaloneLabelLine(tmplAddress)) out.address = tmplAddress;

  const tmplCity = customer.city ??
    valueBelowTemplateLabel(text, ["Cidade"]) ??
    valueAfterTemplateLabel(text, ["Cidade"]) ??
    firstMatch(text, /Cidade[^\S\r\n]*:?[^\S\r\n]*([^\n]{2,80})/i) ??
    valueBetweenLabels(text, ["Cidade"], ["UF", "CEP", "CNPJ", "Bairro", "Telefone", "Fax"]);
  const tmplUf = customer.state ??
    valueBelowTemplateLabel(text, ["UF", "Estado"]) ??
    valueAfterTemplateLabel(text, ["UF", "Estado"]) ??
    firstMatch(text, /\bUF[^\S\r\n]*:?[^\S\r\n]*([A-Z]{2})\b/);
  if (tmplCity) out.city = tmplCity;
  if (tmplUf && /^[A-Z]{2}$/i.test(tmplUf.trim())) out.state = tmplUf.trim().toUpperCase();

  // Suporte para "Cidade/UF" numa linha só
  if (!out.city) out.city = pickCityFromPairs(pairs);
  if (!out.state) out.state = pickStateFromPairs(pairs);

  const tmplCep = customer.cep ??
    valueBelowTemplateLabel(text, ["CEP"]) ??
    valueAfterTemplateLabel(text, ["CEP"]) ??
    firstMatch(text, /\b(\d{5}-?\d{3}|\d{3}\.?\d{3}-?\d{3})\b/) ??
    valueBetweenLabels(text, ["CEP"], ["Bairro", "Telefone", "Fax", "CNPJ", "UF", "Cidade"]);
  if (tmplCep) out.cep = extractCepFromText(tmplCep);

  out.bairro = customer.bairro ?? null;
  out.telefone = customer.telefone ?? null;

  // Campo 2: (separado abaixo) Médico/Paciente/Plano/CPF/Data
  out.surgery_name = mp.surgery_name ?? pickSurgeryNameFromPairs(pairs, text);

  out.doctor_name =
    mp.doctor_name ??
    (() => {
      const tmplDoctor = valueAfterTemplateLabel(text, ["Médico", "Medico"]);
      return tmplDoctor && looksLikeDoctorName(tmplDoctor) ? tmplDoctor : null;
    })();

  out.patient_name =
    mp.patient_name ??
    (() => {
      const tmplPatient = valueAfterTemplateLabel(text, ["Paciente"]);
      return tmplPatient && looksLikePersonName(tmplPatient) ? tmplPatient : null;
    })();

  out.insurance_name =
    mp.insurance_name ??
    (() => {
      const tmplPlan = valueAfterTemplateLabel(text, ["Plano de saúde", "Plano de saude"]);
      return tmplPlan && looksLikeHealthPlanCode(tmplPlan) ? tmplPlan : null;
    })();

  out.cpf =
    mp.cpf ??
    (() => {
      const tmplCpf = valueAfterTemplateLabel(text, ["CPF"]);
      const anyCpf = tmplCpf ?? firstMatch(text, CPF_RE) ?? firstMatch(text, CPF_DIGITS_RE);
      return anyCpf && looksLikeCpf(anyCpf) ? anyCpf : null;
    })();

  out.surgery_date =
    mp.surgery_date ??
    (() => {
      const tmplSurgeryDate = valueAfterTemplateLabel(text, [
        "Data da cirurgia",
        "Data do procedimento",
        "Data cirurgica",
        "Data cirúrgica",
      ]);
      return tmplSurgeryDate
        ? pickSurgeryDateFromPairs(pairs, `Data da cirurgia: ${tmplSurgeryDate}\n${text}`)
        : null;
    })();

  // Zera campos fora do escopo pedido (para não confundir)
  out.representative = null;
  out.requester = null;
  out.requester_channel = null;

  // Segurança: se o banco estiver tipando `surgery_date` como timestamp,
  // normaliza para formato compatível ou grava null.
  out.surgery_date = out.surgery_date ? normalizeSurgeryDateForDb(out.surgery_date) : null;

  const ev = parseEventDatetimesFromSurgeryDate(out.surgery_date);
  out.event_start_at = ev.event_start_at;
  out.event_end_at = ev.event_end_at;
  out.event_timezone = ev.event_timezone;
  out.event_datetime_raw = ev.event_datetime_raw;

  return out;
}

function isItemsSectionHeader(t: string): boolean {
  return /^(Observa[cç][oõ]es|Materiais?|Itens?|Lista\s+de\s+materiais?|OPME|Equipamentos?)\s*:?\s*$/i.test(
    t,
  );
}

export function parseDocumentItems(raw: string): ParsedDocumentItem[] {
  const text = raw.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const items: ParsedDocumentItem[] = [];
  let capture = false;
  let blankSinceItems = 0;
  const seen = new Set<string>();

  const push = (content: string) => {
    const c = NORM(content);
    if (c.length < 3 || c.length > 500) return;
    const key = c.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ content: c });
  };

  for (let i = 0; i < lines.length; i++) {
    const t = NORM(lines[i]);
    if (!t) {
      if (capture) blankSinceItems += 1;
      if (blankSinceItems >= 2) capture = false;
      continue;
    }
    blankSinceItems = 0;

    if (isItemsSectionHeader(t) || /^(Observa[cç][oõ]es|Materiais?|Itens?)\b/i.test(t)) {
      capture = true;
      const afterColon = t.includes(":") ? t.split(":").slice(1).join(":").trim() : "";
      if (afterColon.length > 3) push(afterColon);
      continue;
    }

    if (capture) {
      if (/^[A-Za-zÀ-ú][^:]{0,42}:\s*\S/.test(t) && !/^[-•*\d]/.test(t)) {
        capture = false;
        continue;
      }
      const bullet = t.replace(/^[-•*]\s*|\d+[\).]\s*/, "");
      push(bullet);
    }
  }

  if (items.length === 0) {
    for (const t of lines.map((l) => NORM(l))) {
      if (/^material\b/i.test(t) || /^obs\.?\b/i.test(t)) push(t);
    }
  }

  return items.slice(0, 200);
}
