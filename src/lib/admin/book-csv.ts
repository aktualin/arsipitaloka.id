/**
 * Definisi kolom CSV + validasi baris untuk import buku (W24).
 *
 * Modul ini **bersih** (tidak menyentuh Prisma/server-only) supaya satu
 * sumber kebenaran dipakai dua tempat:
 * - Client Component (pratinjau & validasi sebelum kirim),
 * - Server Action (validasi ulang + penyimpanan).
 *
 * Kolom mengikuti model `Book` di `prisma/schema.prisma` — hanya kolom yang
 * benar-benar ada di model yang dipakai.
 */

import { parseCsv } from "@/lib/csv";
import { slugify } from "@/lib/slug";

export type BookCsvColumnType =
  | "text"
  | "int"
  | "number"
  | "money"
  | "boolean"
  | "category";

export type BookCsvColumn = {
  /** Kunci internal (dipakai di data Prisma). */
  key: string;
  /** Nama kolom CSV yang baku. */
  label: string;
  /** Nama alternatif yang diterima (case-insensitive). */
  aliases: string[];
  type: BookCsvColumnType;
  required?: boolean;
  help: string;
};

export const BOOK_CSV_COLUMNS: BookCsvColumn[] = [
  {
    key: "title",
    label: "title",
    aliases: ["judul", "nama", "namabuku", "booktitle", "judulbuku"],
    type: "text",
    required: true,
    help: "Judul buku. Wajib diisi.",
  },
  {
    key: "author",
    label: "author",
    aliases: ["penulis", "namapenulis", "authorname"],
    type: "text",
    required: true,
    help: "Penulis buku. Wajib diisi.",
  },
  {
    key: "slug",
    label: "slug",
    aliases: ["slugbuku"],
    type: "text",
    help: "Kosongkan — dibuat otomatis dari judul bila belum dipakai.",
  },
  {
    key: "description",
    label: "description",
    aliases: ["deskripsi", "ringkasan", "sinopsis", "deskripsibuku"],
    type: "text",
    help: "Deskripsi / sinopsis buku.",
  },
  {
    key: "category",
    label: "category",
    aliases: ["kategori", "namakategori"],
    type: "category",
    help: "Nama kategori (harus sudah ada di /admin/category).",
  },
  {
    key: "coverUrl",
    label: "coverUrl",
    aliases: ["cover", "sampul", "gambar", "gambarsampul", "coverimage"],
    type: "text",
    help: "URL atau path gambar sampul.",
  },
  {
    key: "fileUrl",
    label: "fileUrl",
    aliases: ["file", "berkas", "filedownload", "fileebook"],
    type: "text",
    help: "Path/URL file e-book (disimpan di storage/private).",
  },
  {
    key: "language",
    label: "language",
    aliases: ["bahasa"],
    type: "text",
    help: "Bahasa buku (default: Indonesia).",
  },
  {
    key: "pages",
    label: "pages",
    aliases: ["halaman", "jumlahhalaman", "hal", "pagecount"],
    type: "int",
    help: "Jumlah halaman (default: 1).",
  },
  {
    key: "publishedYear",
    label: "publishedYear",
    aliases: ["tahun", "tahunterbit", "year", "tahunpublikasi"],
    type: "int",
    help: "Tahun terbit (mis. 2011).",
  },
  {
    key: "isbn",
    label: "isbn",
    aliases: ["nomorisbn"],
    type: "text",
    help: "ISBN buku.",
  },
  {
    key: "price",
    label: "price",
    aliases: ["harga", "hargarp", "priceusd", "priceidr", "hargaidr", "idr"],
    type: "money",
    help: "Harga dalam Rupiah (angka). Buku gratis otomatis 0.",
  },
  {
    key: "isFree",
    label: "isFree",
    aliases: ["gratis", "free", "isbebas"],
    type: "boolean",
    help: "true/false — tandai buku gratis.",
  },
  {
    key: "isNew",
    label: "isNew",
    aliases: ["baru", "isbaru", "bukubaru"],
    type: "boolean",
    help: "true/false — tandai buku baru.",
  },
  {
    key: "archived",
    label: "archived",
    aliases: ["arsip", "isarsip"],
    type: "boolean",
    help: "true/false — tandai buku arsip.",
  },
  {
    key: "isDownloadable",
    label: "isDownloadable",
    aliases: ["bisadiunduh", "bisaunduh", "downloadable"],
    type: "boolean",
    help: "true/false — buku boleh diunduh.",
  },
  {
    key: "wordCount",
    label: "wordCount",
    aliases: ["jumlahkata", "jmlkata", "kata", "words"],
    type: "int",
    help: "Jumlah kata.",
  },
  {
    key: "rating",
    label: "rating",
    aliases: ["bintang"],
    type: "number",
    help: "Rating 0–5 (default: 0).",
  },
  {
    key: "readCount",
    label: "readCount",
    aliases: ["dibaca", "jumlahdibaca"],
    type: "int",
    help: "Jumlah dibaca (default: 0).",
  },
  {
    key: "edition",
    label: "edition",
    aliases: ["edisi"],
    type: "text",
    help: "Edisi.",
  },
  {
    key: "translator",
    label: "translator",
    aliases: ["penerjemah"],
    type: "text",
    help: "Penerjemah.",
  },
  {
    key: "editor",
    label: "editor",
    aliases: ["penyunting"],
    type: "text",
    help: "Editor.",
  },
  {
    key: "illustrator",
    label: "illustrator",
    aliases: ["ilustrator", "penggambar"],
    type: "text",
    help: "Ilustrator.",
  },
  {
    key: "publisher",
    label: "publisher",
    aliases: ["penerbit"],
    type: "text",
    help: "Penerbit.",
  },
  {
    key: "copyrightHolder",
    label: "copyrightHolder",
    aliases: ["pemegakhakcipta", "hakcipta", "copyright"],
    type: "text",
    help: "Pemegang hak cipta.",
  },
  {
    key: "order",
    label: "order",
    aliases: ["urutan", "urut"],
    type: "int",
    help: "Urutan tampil (default: 0).",
  },
  {
    key: "tiktokEmbed",
    label: "tiktokEmbed",
    aliases: ["tiktok", "embedtiktok"],
    type: "text",
    help: "Share link / kode embed TikTok.",
  },
];

/** Data buku siap simpan, hasil normalisasi baris CSV. */
export type BookCsvData = {
  title: string;
  author: string;
  slug: string;
  description: string | null;
  category: string | null;
  coverUrl: string | null;
  fileUrl: string | null;
  language: string;
  pages: number;
  publishedYear: number | null;
  isbn: string | null;
  price: number;
  isFree: boolean;
  isNew: boolean;
  archived: boolean;
  isDownloadable: boolean;
  wordCount: number | null;
  rating: number;
  readCount: number;
  edition: string | null;
  translator: string | null;
  editor: string | null;
  illustrator: string | null;
  publisher: string | null;
  copyrightHolder: string | null;
  order: number;
  tiktokEmbed: string | null;
};

export type BookCsvRow = {
  /** Nomor baris di file (baris judul = 1, jadi data pertama = 2). */
  rowNumber: number;
  /** Nilai mentah per kolom (kunci internal kolom). */
  values: Record<string, string>;
  /** Pesan error validasi (kosong bila baris ini sah). */
  errors: string[];
  /** Data siap simpan — `null` bila baris gagal validasi. */
  data: BookCsvData | null;
};

export type BookCsvParse = {
  /** Header CSV apa adanya. */
  headers: string[];
  /** Baris data + hasil validasi. */
  rows: BookCsvRow[];
  /** Header yang tidak dikenali (diabaikan, bukan error). */
  unknownHeaders: string[];
  /** Error tingkat file (mis. kolom wajib tidak ada). */
  error: string | null;
};

/** Normalisasi nama kolom: huruf kecil + tanpa tanda baca. */
export function normalizeHeader(value: string): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const column of BOOK_CSV_COLUMNS) {
    map.set(normalizeHeader(column.label), column.key);
    for (const alias of column.aliases) {
      map.set(normalizeHeader(alias), column.key);
    }
  }
  return map;
})();

/** Pemetaan nama header (sudah dinormalisasi) → kunci kolom internal. */
export function resolveHeaderKey(header: string): string | null {
  return HEADER_LOOKUP.get(normalizeHeader(header)) ?? null;
}

const TRUE_VALUES = new Set([
  "true",
  "1",
  "ya",
  "y",
  "yes",
  "benar",
  "on",
  "bebas",
]);

const FALSE_VALUES = new Set([
  "false",
  "0",
  "tidak",
  "n",
  "no",
  "salah",
  "off",
  "tidakgratis",
]);

/** Ubah teks boolean; `null` berarti isian tidak dikenali. */
export function parseBoolean(value: string): boolean | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "") return false;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

/** Parse bilangan bulat; `null` berarti isian bukan angka bulat. */
export function parseInteger(value: string): number | null {
  const normalized = (value ?? "").trim().replace(/\s+/g, "");
  if (normalized === "") return null;
  if (!/^-?\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Parse angka desimal (rating).
 * `null` berarti isian bukan angka.
 */
export function parseNumber(value: string): number | null {
  const normalized = (value ?? "").trim().replace(/\s+/g, "");
  if (normalized === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse harga (Rupiah). Menerima "50000", "50.000", "Rp 50.000",
 * "Rp50.000", "IDR 50000".
 * `null` berarti isian bukan angka.
 */
export function parseMoney(value: string): number | null {
  let normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "") return null;
  normalized = normalized
    .replace(/^(rp|idr)\s*/i, "")
    .replace(/\s*(rupiah|idr)$/i, "")
    .replace(/[\s.]/g, "");
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function text(value: string | undefined): string {
  return (value ?? "").trim();
}

function nullableText(value: string | undefined): string | null {
  const trimmed = text(value);
  return trimmed === "" ? null : trimmed;
}

/**
 * Validasi satu baris → data siap simpan + daftar error.
 * Error bersifat per-baris: satu baris salah tidak membatalkan baris lain.
 */
export function validateBookRow(values: Record<string, string>): {
  errors: string[];
  data: BookCsvData;
} {
  const errors: string[] = [];

  const title = text(values.title);
  const author = text(values.author);
  if (!title) errors.push("Judul wajib diisi.");
  if (!author) errors.push("Penulis wajib diisi.");

  const slug = text(values.slug);
  if (slug && !slugify(slug)) {
    errors.push("Slug tidak valid — biarkan kosong agar dibuat otomatis.");
  }

  let pages = 1;
  const pagesRaw = text(values.pages);
  if (pagesRaw) {
    const parsed = parseInteger(pagesRaw);
    if (parsed === null || parsed < 1) {
      errors.push("Jumlah halaman harus angka bulat ≥ 1.");
    } else {
      pages = parsed;
    }
  }

  let price = 0;
  const priceRaw = text(values.price);
  if (priceRaw) {
    const parsed = parseMoney(priceRaw);
    if (parsed === null) {
      errors.push("Harga harus angka (contoh: 50000 atau Rp50.000).");
    } else {
      price = parsed;
    }
  }

  let publishedYear: number | null = null;
  const yearRaw = text(values.publishedYear);
  if (yearRaw) {
    const parsed = parseInteger(yearRaw);
    if (parsed === null || parsed < 1000 || parsed > 2999) {
      errors.push("Tahun terbit harus angka antara 1000 dan 2999.");
    } else {
      publishedYear = parsed;
    }
  }

  let wordCount: number | null = null;
  const wordCountRaw = text(values.wordCount);
  if (wordCountRaw) {
    const parsed = parseInteger(wordCountRaw);
    if (parsed === null || parsed < 0) {
      errors.push("Jumlah kata harus angka bulat ≥ 0.");
    } else {
      wordCount = parsed;
    }
  }

  let readCount = 0;
  const readCountRaw = text(values.readCount);
  if (readCountRaw) {
    const parsed = parseInteger(readCountRaw);
    if (parsed === null || parsed < 0) {
      errors.push("Jumlah dibaca harus angka bulat ≥ 0.");
    } else {
      readCount = parsed;
    }
  }

  let order = 0;
  const orderRaw = text(values.order);
  if (orderRaw) {
    const parsed = parseInteger(orderRaw);
    if (parsed === null) {
      errors.push("Urutan harus angka bulat.");
    } else {
      order = parsed;
    }
  }

  let rating = 0;
  const ratingRaw = text(values.rating);
  if (ratingRaw) {
    const parsed = parseNumber(ratingRaw);
    if (parsed === null || parsed < 0 || parsed > 5) {
      errors.push("Rating harus angka 0–5.");
    } else {
      rating = parsed;
    }
  }

  const booleans: {
    key: "isFree" | "isNew" | "archived" | "isDownloadable";
    label: string;
  }[] = [
    { key: "isFree", label: "Gratis" },
    { key: "isNew", label: "Baru" },
    { key: "archived", label: "Arsip" },
    { key: "isDownloadable", label: "Bisa diunduh" },
  ];
  const flags: Record<string, boolean> = {
    isFree: false,
    isNew: false,
    archived: false,
    isDownloadable: false,
  };
  for (const item of booleans) {
    const parsed = parseBoolean(text(values[item.key]));
    if (parsed === null) {
      errors.push(`${item.label} harus true/false (atau ya/tidak).`);
    } else {
      flags[item.key] = parsed;
    }
  }

  const isFree = flags.isFree;
  // Buku gratis tidak boleh punya harga.
  const finalPrice = isFree ? 0 : price;

  const data: BookCsvData = {
    title,
    author,
    slug,
    description: nullableText(values.description),
    category: nullableText(values.category),
    coverUrl: nullableText(values.coverUrl),
    fileUrl: nullableText(values.fileUrl),
    language: text(values.language) || "Indonesia",
    pages,
    publishedYear,
    isbn: nullableText(values.isbn),
    price: finalPrice,
    isFree,
    isNew: flags.isNew,
    archived: flags.archived,
    isDownloadable: flags.isDownloadable,
    wordCount,
    rating,
    readCount,
    edition: nullableText(values.edition),
    translator: nullableText(values.translator),
    editor: nullableText(values.editor),
    illustrator: nullableText(values.illustrator),
    publisher: nullableText(values.publisher),
    copyrightHolder: nullableText(values.copyrightHolder),
    order,
    tiktokEmbed: nullableText(values.tiktokEmbed),
  };

  return { errors, data };
}

/**
 * Baca teks CSV menjadi baris tervalidasi.
 * Baris kosong dilewati; nomor baris tetap mengikuti posisi di file.
 */
export function parseBookCsv(text: string): BookCsvParse {
  const matrix = parseCsv(text ?? "");
  const nonEmpty = matrix.filter((cells) => cells.some((cell) => cell.trim() !== ""));

  if (nonEmpty.length === 0) {
    return {
      headers: [],
      rows: [],
      unknownHeaders: [],
      error: "File CSV kosong.",
    };
  }

  const headerRow = nonEmpty[0];
  const headers = headerRow.map((cell) => cell.trim());

  const keyByIndex: (string | null)[] = headers.map((header) =>
    header ? resolveHeaderKey(header) : null,
  );

  const unknownHeaders = headers.filter(
    (header, index) => header && !keyByIndex[index],
  );

  if (!keyByIndex.includes("title")) {
    return {
      headers,
      rows: [],
      unknownHeaders,
      error:
        "Kolom 'title' (atau 'judul') tidak ditemukan di baris pertama file CSV.",
    };
  }

  const rows: BookCsvRow[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    const cells = matrix[index];
    if (!cells || cells.every((cell) => cell.trim() === "")) continue;

    const values: Record<string, string> = {};
    keyByIndex.forEach((key, cellIndex) => {
      if (!key) return;
      values[key] = cells[cellIndex] ?? "";
    });

    const { errors, data } = validateBookRow(values);

    rows.push({
      // +1 untuk baris judul; +1 lagi supaya baris data pertama = 2.
      rowNumber: index + 1,
      values,
      errors,
      data: errors.length === 0 ? data : null,
    });
  }

  return { headers, rows, unknownHeaders, error: null };
}

/** Hasil import per baris (dikembalikan server action). */
export type ImportRowStatus = "created" | "skipped" | "failed";

export type ImportRowResult = {
  rowNumber: number;
  title: string;
  slug: string | null;
  status: ImportRowStatus;
  reason: string | null;
};

export type ImportResult = {
  ok: boolean;
  message: string;
  created: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
};

/** Template CSV siap unduh (dipakai di Client Component). */
export const BOOK_CSV_TEMPLATE_HEADERS = [
  "title",
  "author",
  "slug",
  "description",
  "category",
  "coverUrl",
  "language",
  "pages",
  "publishedYear",
  "isbn",
  "price",
  "isFree",
  "publisher",
];

export const BOOK_CSV_TEMPLATE_ROW =
  '"Renungan Kloset","Rieke Diah Pitaloka","","Kumpulan renungan di ruang kloset.","Fiksi","/images/seed/cover-renungan-kloset.jpg","Indonesia",248,2003,"978-979-1234-56-7",45000,false,"Yayasan Pitaloka"';
