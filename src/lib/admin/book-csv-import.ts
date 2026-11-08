"use server";

/**
 * Import buku dari CSV (W24).
 *
 * Server action ini:
 * - membaca teks CSV (kirim dari Client Component),
 * - mem-parse + memvalidasi tiap baris (sumber kebenaran: `./book-csv`),
 * - membuat buku dengan `prisma.book.create` — TIDAK pernah `deleteMany`
 *   (buku yang pernah dipesan tertahan FK Restrict),
 * - melewati baris yang slug-nya sudah ada (idempoten) dan melaporkan sisanya
 *   per baris: created / skipped / failed.
 */

import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./require-admin";
import { slugify, withUniqueSuffix } from "@/lib/slug";
import {
  parseBookCsv,
  type ImportResult,
  type ImportRowResult,
} from "./book-csv";

const MAX_ROWS = 500;
/** Batas ukuran teks CSV (badan server action dibatasi ~1 MB). */
const MAX_CHARS = 400_000;

/**
 * Impor buku dari isi CSV.
 *
 * `csvText` = isi file `.csv` (UTF-8, boleh BER-BOM).
 */
export async function importBooksFromCsv(csvText: string): Promise<ImportResult> {
  const empty: ImportResult = {
    ok: false,
    message: "",
    created: 0,
    skipped: 0,
    failed: 0,
    rows: [],
  };

  const admin = await requireAdmin();
  if (!admin) {
    return { ...empty, message: "Tidak diizinkan." };
  }

  if ((csvText ?? "").length > MAX_CHARS) {
    return {
      ...empty,
      message: `Berkas terlalu besar (maksimal ${Math.round(MAX_CHARS / 1000)} KB per impor).`,
    };
  }

  const parsed = parseBookCsv(csvText ?? "");
  if (parsed.error) {
    return { ...empty, message: parsed.error };
  }
  if (parsed.rows.length === 0) {
    return { ...empty, message: "Tidak ada baris data di file CSV." };
  }
  if (parsed.rows.length > MAX_ROWS) {
    return {
      ...empty,
      message: `Terlalu banyak baris (${parsed.rows.length}). Maksimal ${MAX_ROWS} baris per impor.`,
    };
  }

  // Slug & kategori yang sudah ada — diambil sekali, bukan per baris.
  const [existingBooks, categories] = await Promise.all([
    prisma.book.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  const usedSlugs = new Set(existingBooks.map((book) => book.slug));

  const categoryByName = new Map<string, string>();
  const categoryBySlug = new Map<string, string>();
  for (const category of categories) {
    categoryByName.set(category.name.trim().toLowerCase(), category.id);
    categoryBySlug.set(category.slug.trim().toLowerCase(), category.id);
  }

  const results: ImportRowResult[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of parsed.rows) {
    const title = row.data?.title ?? row.values.title?.trim() ?? "";

    // 1. Validasi baris (sudah dicek di pratinjau, diulang di server).
    if (!row.data || row.errors.length > 0) {
      failed += 1;
      results.push({
        rowNumber: row.rowNumber,
        title,
        slug: null,
        status: "failed",
        reason: row.errors.join(" ") || "Baris tidak valid.",
      });
      continue;
    }

    const data = row.data;

    // 2. Kategori → categoryId (kategori baru tidak dibuat otomatis).
    let categoryId: string | null = null;
    if (data.category) {
      const key = data.category.toLowerCase();
      categoryId =
        categoryByName.get(key) ?? categoryBySlug.get(slugify(data.category)) ?? null;
      if (!categoryId) {
        failed += 1;
        results.push({
          rowNumber: row.rowNumber,
          title,
          slug: null,
          status: "failed",
          reason: `Kategori "${data.category}" tidak ditemukan. Buat kategorinya dulu di /admin/category.`,
        });
        continue;
      }
    }

    // 3. Slug: pakai yang diberikan, atau dibuat dari judul.
    //    Slug yang sudah dipakai → baris dilewati (import idempoten).
    const baseSlug = slugify(data.slug || data.title);
    if (!baseSlug) {
      failed += 1;
      results.push({
        rowNumber: row.rowNumber,
        title,
        slug: null,
        status: "failed",
        reason: "Slug tidak bisa dibuat dari judul.",
      });
      continue;
    }

    if (usedSlugs.has(baseSlug)) {
      skipped += 1;
      results.push({
        rowNumber: row.rowNumber,
        title,
        slug: baseSlug,
        status: "skipped",
        reason: "Slug sudah dipakai — buku ini sudah ada, jadi dilewati.",
      });
      continue;
    }

    // Dua baris dalam satu file dengan slug sama → baris kedua memakai
    // sufiks unik (e-book → e-book-2 → e-book-3), sama seperti CRUD biasa.
    const slug = withUniqueSuffix(baseSlug, (candidate) => usedSlugs.has(candidate));

    try {
      await prisma.book.create({
        data: {
          title: data.title,
          author: data.author,
          slug,
          description: data.description,
          categoryId,
          coverUrl: data.coverUrl,
          fileUrl: data.fileUrl,
          language: data.language,
          pages: data.pages,
          publishedYear: data.publishedYear,
          isbn: data.isbn,
          priceUsd: data.price,
          isFree: data.isFree,
          isNew: data.isNew,
          archived: data.archived,
          isDownloadable: data.isDownloadable,
          wordCount: data.wordCount,
          rating: data.rating,
          readCount: data.readCount,
          edition: data.edition,
          translator: data.translator,
          editor: data.editor,
          illustrator: data.illustrator,
          publisher: data.publisher,
          copyrightHolder: data.copyrightHolder,
          order: data.order,
          tiktokEmbed: data.tiktokEmbed,
        },
      });
      usedSlugs.add(slug);
      created += 1;
      results.push({
        rowNumber: row.rowNumber,
        title: data.title,
        slug,
        status: "created",
        reason: null,
      });
    } catch (error: any) {
      failed += 1;
      const reason =
        error?.code === "P2002"
          ? "Nilai unik sudah dipakai — buku ini bentrok dengan data lain."
          : "Gagal menyimpan ke database.";
      if (error?.code !== "P2002") console.error(error);
      results.push({
        rowNumber: row.rowNumber,
        title,
        slug,
        status: "failed",
        reason,
      });
    }
  }

  if (created > 0) {
    revalidatePath("/admin/book");
    revalidatePath("/");
    revalidatePath("/buku");
    updateTag("content");
  }

  const parts: string[] = [];
  if (created > 0) parts.push(`${created} buku dibuat`);
  if (skipped > 0) parts.push(`${skipped} dilewati (sudah ada)`);
  if (failed > 0) parts.push(`${failed} gagal`);

  return {
    ok: created > 0 || failed === 0,
    message:
      parts.length > 0
        ? `Import selesai — ${parts.join(", ")}.`
        : "Import selesai.",
    created,
    skipped,
    failed,
    rows: results,
  };
}
