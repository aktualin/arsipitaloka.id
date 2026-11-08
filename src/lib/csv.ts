/**
 * Parser CSV kecil (tanpa dependensi baru).
 *
 * Yang ditangani:
 * - BOM UTF-8 di awal file (file dari Excel/Windows sering memakai BOM),
 * - baris CRLF (`\r\n`), LF (`\n`), atau CR (`\n` lawas),
 * - kolom yang diapit tanda kutip dan mengandung koma/baris baru,
 * - tanda kutip ganda di dalam kolom yang diapit (`""` → `"`),
 * - pemisah `,` (default), `;`, atau tab — ditebak dari baris judul.
 *
 * Modul ini murni (tanpa Node/Prisma) supaya bisa dipakai di Client
 * Component (pratinjau) maupun di Server Action (penyimpanan).
 */

/** Normalisasi pemisah: petakan nama pemisah ke karakternya. */
const DELIMITER_ALIASES: Record<string, string> = {
  "koma": ",",
  "comma": ",",
  "point": ";",
  "semicolon": ";",
  "titik": ";",
  "tab": "\t",
};

export type CsvOptions = {
  /** Pemisah kolom; kalau kosong, ditebak otomatis. */
  delimiter?: string;
};

/**
 * Tebak pemisah kolom dari baris judul (baris pertama di luar kutip).
 * Pemisah yang paling sering muncul menang; koma jadi default.
 */
export function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (text[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "\n" || ch === "\r") break;
    if (ch in counts) counts[ch] += 1;
  }

  let best = ",";
  for (const candidate of [";", "\t", ","]) {
    if (counts[candidate] > counts[best]) best = candidate;
  }
  return best;
}

/** Buang BOM UTF-8 di awal teks. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Pecah teks CSV menjadi array sel (string[][]).
 * Baris kosong di akhir file tidak ikut dibuang — pemanggil yang deciding.
 */
export function parseCsv(input: string, options: CsvOptions = {}): string[][] {
  const text = stripBom(input ?? "");
  const delimiter =
    options.delimiter && options.delimiter.length > 0
      ? options.delimiter
      : detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let hasField = false;

  const pushField = () => {
    row.push(field);
    field = "";
    hasField = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += ch;
      hasField = true;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      hasField = true;
      continue;
    }

    if (ch === delimiter) {
      pushField();
      continue;
    }

    if (ch === "\r") {
      if (text[i + 1] === "\n") i += 1;
      pushRow();
      continue;
    }

    if (ch === "\n") {
      pushRow();
      continue;
    }

    field += ch;
    hasField = true;
  }

  // Sisa baris terakhir (tanpa baris baru di akhir file).
  if (hasField || field !== "" || row.length > 0) pushRow();

  return rows;
}

/**
 * Baris CSV → objek. Baris pertama dipakai sebagai judul kolom.
 * `null` untuk sel yang tidak ada di baris tersebut.
 */
export function parseCsvObjects(
  input: string,
  options: CsvOptions = {},
): { headers: string[]; rows: Record<string, string>[] } {
  const matrix = parseCsv(input, options);
  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = matrix[0].map((cell) => cell.trim());
  const rows = matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = cells[index] ?? "";
    });
    return record;
  });

  return { headers, rows };
}

export { DELIMITER_ALIASES };
