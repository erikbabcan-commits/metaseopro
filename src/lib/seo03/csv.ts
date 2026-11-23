/**
 * SEO-03 demo: minimal, dependency-free CSV reader for Google Search Console
 * "Pages" exports. Runs entirely in the browser. Nothing here stores or logs
 * the uploaded content.
 */

export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_DATA_ROWS = 5000;

export type CsvDelimiter = "," | ";" | "\t";

export type Seo03ErrorCode =
  | "FILE_TOO_LARGE"
  | "TOO_MANY_ROWS"
  | "EMPTY_FILE"
  | "NOT_TEXT"
  | "WRONG_FORMAT"
  | "NO_VALID_ROWS"
  | "SINGLE_PERIOD"
  | "UNTERMINATED_QUOTE";

export class Seo03Error extends Error {
  readonly code: Seo03ErrorCode;
  constructor(code: Seo03ErrorCode, message: string) {
    super(message);
    this.name = "Seo03Error";
    this.code = code;
  }
}

/** Throws FILE_TOO_LARGE when the file is above the limit (check before reading it). */
export function assertFileSize(bytes: number, limit = MAX_FILE_BYTES): void {
  if (bytes > limit) {
    throw new Seo03Error(
      "FILE_TOO_LARGE",
      `Súbor je príliš veľký (${formatMb(bytes)} MB). Maximum je ${formatMb(limit)} MB.`,
    );
  }
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Picks the delimiter that occurs most often in the header line (outside quotes). */
export function detectDelimiter(text: string): CsvDelimiter {
  const counts: Record<CsvDelimiter, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && (ch === "," || ch === ";" || ch === "\t")) counts[ch]++;
  }
  let best: CsvDelimiter = ",";
  for (const d of [";", "\t"] as const) if (counts[d] > counts[best]) best = d;
  return best;
}

/**
 * RFC 4180-style tokenizer: quoted fields, "" escapes, delimiters and
 * newlines inside quotes, CRLF/LF line endings. Stops with TOO_MANY_ROWS as
 * soon as more than `maxRows` data rows (header excluded) are seen.
 */
export function parseCsv(
  input: string,
  options: { delimiter?: CsvDelimiter; maxRows?: number } = {},
): string[][] {
  const text = stripBom(input);
  const delimiter = options.delimiter ?? detectDelimiter(text);
  const maxRows = options.maxRows ?? MAX_DATA_ROWS;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  const pushRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = "";
    fieldStarted = false;
    if (rows.length - 1 > maxRows) {
      throw new Seo03Error(
        "TOO_MANY_ROWS",
        `Súbor má viac ako ${maxRows.toLocaleString("sk-SK")} riadkov. Zúž export v Search Console.`,
      );
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
      fieldStarted = false;
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      pushRow();
    } else if (ch === "\n") {
      pushRow();
    } else {
      field += ch;
      fieldStarted = true;
    }
  }
  if (inQuotes) {
    throw new Seo03Error(
      "UNTERMINATED_QUOTE",
      "CSV má neuzavreté úvodzovky. Skontroluj, či je súbor celý.",
    );
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

/** Lowercase + strip diacritics for header matching ("Kliknutia" -> "kliknutia"). */
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses a GSC number. Handles "1,234", "1 234", "1.234,5", "12,5 %", "3.4".
 * `integer` metrics treat any separator as a thousands separator.
 */
export function parseNumber(raw: string, integer: boolean): number | null {
  let s = raw.replace(/[\s\u00a0\u202f]/g, "").replace(/%$/, "");
  if (s === "" || s === "-" || s === "—") return null;
  if (integer) {
    s = s.replace(/[.,'](?=\d{3}(\D|$))/g, "");
  } else {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > -1 && lastDot > -1) {
      const decimal = lastComma > lastDot ? "," : ".";
      const thousands = decimal === "," ? "." : ",";
      s = s.split(thousands).join("").replace(decimal, ".");
    } else if (lastComma > -1) {
      s = s.replace(",", ".");
    }
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
