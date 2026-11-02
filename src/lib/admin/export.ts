import { strToU8, zipSync } from "fflate";

/**
 * Ekspor laporan admin ke CSV dan XLSX.
 *
 * XLSX ditulis sendiri (bukan pakai pustaka tambahan): paket `.xlsx` itu
 * zip berisi beberapa bagian XML. Modul ini merakit paket minimal yang
 * valid — `[Content_Types].xml`, relasi, `workbook.xml`, `styles.xml`, dan
 * satu `sheetN.xml` per tabel. Nilai disimpan sebagai `inlineStr` supaya
 * tidak perlu `sharedStrings.xml`.
 *
 * Aturan yang dipakai bersama oleh CSV dan XLSX:
 * - angka Currency/angka bulat ditulis sebagai angka (bukan teks), supaya
 *   Excel bisa menjumlahkan kolomnya;
 * - pemisah desimal mengikuti Indonesia (koma) — `formatRupiah` sudah
 *   menghasilkan "Rp1.200.000", jadi untuk kolom uang kita simpan angka
 *   mentahnya dan biarkan format sel yang berlaku di Excel.
 */

export type CellValue = string | number | null | undefined;

export type SheetColumn = {
  header: string;
  /** Format isi sel: teks biasa, angka bulat, atau angka desimal. */
  type?: "text" | "integer" | "decimal";
  width?: number;
};

export type Sheet = {
  name: string;
  columns: SheetColumn[];
  rows: CellValue[][];
};

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/** Escape satu sel CSV (RFC 4180). */
function csvCell(value: CellValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Susun CSV dari beberapa sheet. Sheet pertama jadi isi file; sheet
 * berikutnya dipisah baris kosong dan diberi judul (dipakai saat unduh
 * lewat Excel → "Save As" CSV).
 */
export function toCsv(sheets: Sheet[]): string {
  const blocks: string[] = [];

  for (const sheet of sheets) {
    const lines: string[] = [];
    lines.push(sheet.columns.map((column) => csvCell(column.header)).join(","));

    for (const row of sheet.rows) {
      lines.push(row.map(csvCell).join(","));
    }
    blocks.push(lines.join("\r\n"));
  }

  // BOM UTF-8 supaya Excel membaca karakter non-ASCII dengan benar.
  return `\uFEFF${blocks.join("\r\n\r\n")}`;
}

/* ------------------------------------------------------------------ */
/* XLSX                                                                */
/* ------------------------------------------------------------------ */

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Karakter kontrol yang illegal di XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** huruf kolom: 1 → A, 27 → AA. */
function columnName(index: number): string {
  let name = "";
  let n = index;
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function isNumericColumn(column: SheetColumn): boolean {
  return column.type === "integer" || column.type === "decimal";
}

function sheetXml(sheet: Sheet): string {
  const cols = sheet.columns
    .map((column, index) => {
      const width = column.width ?? 18;
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  const headerCells = sheet.columns
    .map((column, index) => {
      const ref = `${columnName(index + 1)}1`;
      return `<c r="${ref}" s="1" t="inlineStr"><is><t xml:space="preserve">${escapeXml(column.header)}</t></is></c>`;
    })
    .join("");

  const bodyRows = sheet.rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 2;
      const cells = sheet.columns
        .map((column, colIndex) => {
          const ref = `${columnName(colIndex + 1)}${rowNumber}`;
          const raw = row[colIndex];

          if (raw === null || raw === undefined || raw === "") {
            return `<c r="${ref}"/>`;
          }

          if (isNumericColumn(column) && typeof raw === "number" && Number.isFinite(raw)) {
            const style = column.type === "decimal" ? 3 : 2;
            return `<c r="${ref}" s="${style}"><v>${raw}</v></c>`;
          }

          const text = String(raw);
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData><row r="1">${headerCells}</row>${bodyRows}</sheetData></worksheet>`;
}

const STYLES_XML = `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF561A1A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function contentTypesXml(count: number): string {
  const overrides = Array.from(
    { length: count },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`;
}

const ROOT_RELS_XML = `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

/** Nama sheet di Excel maksimal 31 karakter dan tidak boleh contain `[ ] : * ? / \`. */
function safeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").trim();
  const trimmed = cleaned.slice(0, 31);
  return trimmed || `Sheet${index + 1}`;
}

/**
 * Susun file `.xlsx` (Uint8Array) dari beberapa sheet.
 */
export function toXlsx(sheets: Sheet[]): Uint8Array {
  const safeSheets = sheets.map((sheet, index) => ({
    ...sheet,
    name: safeSheetName(sheet.name, index),
  }));

  const workbookSheets = safeSheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");

  const workbookXml = `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`;

  const workbookRels = safeSheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  const stylesRel = `<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypesXml(safeSheets.length)),
    "_rels/.rels": strToU8(ROOT_RELS_XML),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(
      `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}${stylesRel}</Relationships>`,
    ),
    "xl/styles.xml": strToU8(STYLES_XML),
  };

  safeSheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetXml(sheet));
  });

  return zipSync(files, { level: 6 });
}

/** Nama file unduhan, mis. "laporan-transaksi-2026-11-06.xlsx". */
export function exportFileName(base: string, extension: string, stamp: string): string {
  return `${base}-${stamp}.${extension}`;
}
