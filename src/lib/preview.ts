/**
 * Pratinjau konten sebelum tayang.
 *
 * Admin boleh membuka halaman publik sebuah konten yang **belum tayang**
 * dengan menambahkan `?preview=1` ke URL publiknya.
 *
 * Aturan main:
 *
 * - `?preview=1` **tidak** membuat halaman jadi publik. Isi yang belum
 *   tayang tetap 404 untuk pengunjung — halaman draft hanya dirender kalau
 *   peminta adalah admin yang sudah login (cek di server, lihat
 *   `requireAdmin()`).
 * - Canonical URL tetap URL publik tanpa query string, dan halaman pratinjau
 *   diberi `noindex` supaya tidak jadi duplikat yang terindeks.
 */

/** Nama parameter query untuk mode pratinjau. */
export const PREVIEW_PARAM = "preview";

/** Nilai query yang dianggap "mode pratinjau". */
const PREVIEW_VALUES = new Set(["1", "true"]);

/** Bentuk `searchParams` yang dipakai halaman detail. */
export type PreviewSearchParams = {
  preview?: string | string[];
};

/**
 * True kalau permintaan memakai mode pratinjau.
 *
 * Parameter lain (mis. `?preview=0`) diabaikan supaya mode pratinjau hanya
 * aktif kalau memang diminta.
 */
export function isPreviewRequested(
  sp?: PreviewSearchParams | null,
): boolean {
  const raw = sp?.[PREVIEW_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return false;
  return PREVIEW_VALUES.has(value.trim().toLowerCase());
}

/** Query string untuk mode pratinjau. */
export const PREVIEW_QUERY = `${PREVIEW_PARAM}=1`;

/**
 * Aturan visibilitas konten.
 *
 * Konten yang **belum tayang** (`isLive === false`) hanya boleh dirender
 * kalau memintaannya mode pratinjau — dan mode pratinjau hanya berlaku
 * untuk admin (dicek server-side lewat `requireAdmin()`).
 *
 * Pengunjung biasa (`isPreview === false`) tetap mendapat 404, persis
 * seperti sebelum fitur pratinjau ada.
 */
export function canRenderContent({
  isLive,
  isPreview,
}: {
  /** Konten sudah tayang untuk pengunjung. */
  isLive: boolean;
  /** Peminta adalah admin dan sedang mempratinjau. */
  isPreview: boolean;
}): boolean {
  return isLive || isPreview;
}
