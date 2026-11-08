import { BOOK_TAB_SLUG } from "@/lib/site-tabs";
import { PREVIEW_QUERY } from "@/lib/preview";

/**
 * Peta entitas admin → halaman publiknya.
 *
 * Dipakai untuk membuat tautan "Pratinjau" di area admin: admin membuka
 * halaman publik konten dengan `?preview=1` supaya bisa melihat tampilannya
 * persis seperti pengunjung, termasuk kalau kontennya belum tayang.
 *
 * Modul ini aman dipakai di Client Component (tidak ada import server).
 */
export type PreviewEntityKey =
  | "article"
  | "book"
  | "documentation"
  | "social"
  | string;

/**
 * Path pratinjau untuk satu baris entitas admin.
 *
 * Mengembalikan `null` kalau entitas itu tidak punya halaman detail publik
 * (mis. kategori, video TikTok) atau slug-nya belum ada.
 */
export function previewPathForEntity(
  entityKey: PreviewEntityKey,
  values: Record<string, unknown> | null | undefined,
): string | null {
  const slug = typeof values?.slug === "string" ? values.slug.trim() : "";
  const id = typeof values?.id === "string" ? values.id.trim() : "";

  switch (entityKey) {
    // Artikel (berita/blog/UMKM) → pola blog, satu URL untuk semua kanal.
    case "article":
      return slug ? `/artikel/${slug}?${PREVIEW_QUERY}` : null;
    // Semua buku adalah e-book — URL kanonik selalu di bawah tab e-book.
    case "book":
      return slug ? `/buku/${BOOK_TAB_SLUG}/${slug}?${PREVIEW_QUERY}` : null;
    case "documentation":
      return slug ? `/dokumentasi/${slug}?${PREVIEW_QUERY}` : null;
    // Video media sosial → halaman detail pakai id, bukan slug.
    case "social":
      return id ? `/sosmed/${id}?${PREVIEW_QUERY}` : null;
    default:
      return null;
  }
}

/**
 * Tautan "kembali ke admin" untuk banner pratinjau.
 *
 * `entityKey` = kunci entitas (`/admin/<key>`), `id` = id baris yang
 * dipratinjau — hasilnya membuka form ubah untuk baris itu.
 */
export function previewBackHref(
  entityKey: PreviewEntityKey,
  id?: string | null,
): string {
  const base = `/admin/${entityKey}`;
  return id ? `${base}?edit=${encodeURIComponent(id)}` : base;
}
