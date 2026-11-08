"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { FileUp, Download, Upload, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  BOOK_CSV_TEMPLATE_HEADERS,
  BOOK_CSV_TEMPLATE_ROW,
  parseBookCsv,
  type ImportResult,
} from "@/lib/admin/book-csv";
import { importBooksFromCsv } from "@/lib/admin/book-csv-import";

const PREVIEW_LIMIT = 50;

function formatPrice(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Unduh template CSV (dibuat di browser, tanpa file statis).
 */
function downloadTemplate() {
  const content = `${BOOK_CSV_TEMPLATE_HEADERS.join(",")}\r\n${BOOK_CSV_TEMPLATE_ROW}\r\n`;
  const blob = new Blob(["﻿", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-import-buku.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function BookCsvImport() {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseBookCsv(csvText), [csvText]);

  const validRows = parsed.rows.filter((row) => row.errors.length === 0);
  const invalidRows = parsed.rows.filter((row) => row.errors.length > 0);
  const previewRows = parsed.rows.slice(0, PREVIEW_LIMIT);

  async function handleFile(file: File | null) {
    setResult(null);
    setFileError(null);
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && file.type !== "text/csv") {
      setFileError("Berkas harus berformat .csv.");
      return;
    }
    try {
      const text = await file.text();
      setCsvText(text);
      setFileName(file.name);
    } catch {
      setFileError("Gagal membaca berkas.");
    }
  }

  function handleSubmit() {
    if (!csvText.trim()) return;
    startTransition(async () => {
      const response = await importBooksFromCsv(csvText);
      setResult(response);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-black">
          1. Pilih berkas CSV
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Baris pertama file dipakai sebagai nama kolom. Berkas dibaca sebagai
          UTF-8 (BOM aman), pemisah koma, titik koma, atau tab dikenali
          otomatis, dan kolom yang diapit tanda kutip boleh mengandung koma
          atau baris baru.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              void handleFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-maroon-dark px-4 text-sm font-medium text-white"
          >
            <FileUp size={16} /> Pilih berkas .csv
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-300 px-4 text-sm font-medium text-neutral-700"
          >
            <Download size={16} /> Unduh template
          </button>
          {fileName ? (
            <span className="truncate text-sm text-neutral-500">{fileName}</span>
          ) : null}
        </div>

        {fileError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {fileError}
          </p>
        ) : null}

        <label className="mt-5 block text-sm font-medium text-neutral-700">
          2. Atau tempel isi CSV di sini
        </label>
        <textarea
          value={csvText}
          onChange={(event) => {
            setCsvText(event.target.value);
            setFileName(null);
            setResult(null);
          }}
          rows={8}
          spellCheck={false}
          placeholder={'title,author,price\n"Judul Buku","Rieke Diah Pitaloka",45000'}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-800"
        />
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-black">
          3. Periksa pratinjau
        </h2>

        {parsed.error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {parsed.error}
          </p>
        ) : null}

        {!parsed.error && parsed.rows.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Belum ada data. Pilih berkas atau tempel CSV di atas.
          </p>
        ) : null}

        {!parsed.error && parsed.rows.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              {parsed.rows.length} baris terbaca · {validRows.length} siap
              diimpor · {invalidRows.length} bermasalah
              {parsed.unknownHeaders.length > 0
                ? ` · kolom diabaikan: ${parsed.unknownHeaders.join(", ")}`
                : ""}
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Baris</th>
                    <th className="px-3 py-2 font-medium">Judul</th>
                    <th className="px-3 py-2 font-medium">Slug</th>
                    <th className="px-3 py-2 font-medium">Kategori</th>
                    <th className="px-3 py-2 font-medium">Harga</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-3 py-2 text-neutral-500">{row.rowNumber}</td>
                      <td className="px-3 py-2 text-neutral-800">
                        {row.data?.title || row.values.title || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                        {row.data?.slug || "otomatis"}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {row.data?.category || "—"}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {row.data
                          ? row.data.isFree
                            ? "Gratis"
                            : formatPrice(row.data.price)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 ? (
                          <span className="inline-flex items-start gap-1 text-xs text-red-700">
                            <XCircle size={14} className="mt-0.5 shrink-0" />
                            {row.errors.join(" ")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 size={14} /> Siap
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsed.rows.length > PREVIEW_LIMIT ? (
              <p className="mt-2 text-xs text-neutral-500">
                Menampilkan {PREVIEW_LIMIT} baris pertama dari{" "}
                {parsed.rows.length}.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending || validRows.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-maroon-dark px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={16} />
                {pending
                  ? "Mengimpor…"
                  : `Impor ${validRows.length} buku`}
              </button>
              {invalidRows.length > 0 ? (
                <span className="text-sm text-neutral-500">
                  {invalidRows.length} baris bermasalah akan dilaporkan
                  sebagai gagal.
                </span>
              ) : null}
            </div>
          </>
        ) : null}

        {result ? (
          <div className="mt-5 space-y-3">
            <p
              role="status"
              className={
                result.failed > 0
                  ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              }
            >
              {result.message}
            </p>

            {result.rows.length > 0 ? (
              <div className="max-h-96 overflow-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="sticky top-0 border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Baris</th>
                      <th className="px-3 py-2 font-medium">Judul</th>
                      <th className="px-3 py-2 font-medium">Hasil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className="border-b border-neutral-100 last:border-0"
                      >
                        <td className="px-3 py-2 text-neutral-500">
                          {row.rowNumber}
                        </td>
                        <td className="px-3 py-2 text-neutral-800">
                          {row.title || "—"}
                          {row.slug ? (
                            <span className="block font-mono text-xs text-neutral-500">
                              {row.slug}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === "created" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 size={14} /> Dibuat
                            </span>
                          ) : row.status === "skipped" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
                              <AlertTriangle size={14} /> Dilewati — {row.reason}
                            </span>
                          ) : (
                            <span className="inline-flex items-start gap-1 text-xs text-red-700">
                              <XCircle size={14} className="mt-0.5 shrink-0" />
                              {row.reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <a
              href="/admin/book"
              className="inline-block text-sm text-maroon underline"
            >
              Lihat daftar buku
            </a>
          </div>
        ) : null}
      </section>
    </div>
  );
}
