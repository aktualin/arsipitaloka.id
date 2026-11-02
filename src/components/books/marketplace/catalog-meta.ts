/**
 * Teks metadata (judul & deskripsi) untuk halaman katalog.
 *
 * Dipisah dari komponen supaya `generateMetadata` dan JSON-LD memakai
 * kalimat yang sama — tidak ada duplikasi copy antar halaman.
 *
 * Semua kalimat ditulis natural dalam Bahasa Indonesia, tanpa pengulangan
 * kata kunci yang tidak natural.
 */

/** Deskripsi katalog semua buku (`/buku`). */
export const CATALOG_DESCRIPTION =
  "Katalog e-book karya Rieke Diah Pitaloka di Arsip Pitaloka. Jelajahi koleksi buku, esai, dan kajian yang bisa dibaca langsung secara online.";

/** Deskripsi per kanal (`/buku/<tab>`), memakai label kanal sebagai kunci. */
export const TAB_DESCRIPTIONS: Record<string, string> = {
  "e-book":
    "Katalog e-book karya Rieke Diah Pitaloka: koleksi buku dan tulisan yang tersedia untuk dibaca online di Arsip Pitaloka.",
  "berita-terkini":
    "Kanal Berita Terkini Arsip Pitaloka: liputan, pernyataan, dan perkembangan terkini yang ditulis oleh Rieke Diah Pitaloka.",
  blog: "Kanal Blog Arsip Pitaloka: tulisan dan refleksi Rieke Diah Pitaloka tentang isu kebangsaan, politik, dan kehidupan sehari-hari.",
  umkm: "Kanal UMKM Arsip Pitaloka: artikel praktis untuk pelaku usaha kecil dan menengah, dari pemasaran sampai pengelolaan keuangan.",
  youtube:
    "Kanal YouTube Arsip Pitaloka: kumpulan video ceramah, wawancara, dan dokumentasi karya Rieke Diah Pitaloka.",
  tiktok:
    "Kanal TikTok Arsip Pitaloka: video pendek dari kegiatan dan campaign Indonesia Bebas Korupsi dan Viral For Justice.",
  dokumentasi:
    "Kanal Dokumentasi Arsip Pitaloka: rekaman kegiatan dan jejak digital gerakan Indonesia Bebas Korupsi.",
};

/** Deskripsi kanal (fallback katalog umum). */
export function tabDescription(slug: string | undefined): string {
  if (!slug) return CATALOG_DESCRIPTION;
  return TAB_DESCRIPTIONS[slug] ?? CATALOG_DESCRIPTION;
}

/** Deskripsi kategori buku (`/buku/kategori/<slug>`). */
export function categoryDescription(name: string): string {
  return `Katalog buku kategori ${name} di Arsip Pitaloka — kumpulan karya dan tulisan Rieke Diah Pitaloka yang bisa dibaca online.`;
}

/** Kata kunci ringkas untuk halaman katalog. */
export function catalogKeywords(label: string): string[] {
  return [label, "arsip pitaloka", "rialoka"];
}
