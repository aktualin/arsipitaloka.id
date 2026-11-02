import { prisma } from "@/lib/prisma";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";

/**
 * Pengambil data ringkas untuk JSON-LD `ItemList` pada halaman katalog.
 *
 * Query ini SEPARAT dari query katalog (yang sudah ada di `CatalogView`,
 * `ArticleCatalog`, `SocialMediaCatalog`, `TikTokCatalog`) dan hanya
 * mengambil kolom yang dibutuhkan skema: judul + slug. Batasannya 20 item
 * supaya tidak menarik ribuan baris ke memory.
 *
 * Tidak mengubah query yang sudah dipakai halaman — hanya menambah
 * sumber data untuk data terstruktur.
 */

/** Satu butir daftar isi (nama + path internal tanpa host). */
export type CatalogLinkItem = {
  name: string;
  path: string;
};

/** Batas jumlah item pada `ItemList` (schema.org tidak butuh lebih). */
const ITEM_LIMIT = 20;

/**
 * Buku dalam katalog (semua buku, atau satu kategori).
 * Path detail mengikuti pola kanonik: `/buku/e-book/<slug>`.
 */
export async function listBookItems(
  options: { categorySlug?: string } = {},
): Promise<CatalogLinkItem[]> {
  const books = await prisma.book.findMany({
    where: {
      archived: false,
      ...(options.categorySlug
        ? { category: { slug: options.categorySlug } }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { order: "asc" }],
    take: ITEM_LIMIT,
    select: { slug: true, title: true },
  });

  return books.map((book) => ({
    name: book.title,
    path: `/buku/${BOOK_TAB_SLUG}/${book.slug}`,
  }));
}

/** Artikel pada kanal berita-terkini / blog / umkm. */
export async function listArticleItems(
  type: string,
): Promise<CatalogLinkItem[]> {
  const articles = await prisma.article.findMany({
    where: { type, published: true },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
    take: ITEM_LIMIT,
    select: { slug: true, title: true },
  });

  return articles.map((article) => ({
    name: article.title,
    path: `/artikel/${article.slug}`,
  }));
}

/** Video media sosial pada kanal YouTube (halaman detail `/sosmed/<id>`). */
export async function listSocialMediaItems(
  platform: string,
): Promise<CatalogLinkItem[]> {
  const posts = await prisma.socialMedia.findMany({
    where: { published: true, platform },
    orderBy: { createdAt: "desc" },
    take: ITEM_LIMIT,
    select: { id: true, title: true },
  });

  return posts.map((post) => ({
    name: post.title,
    path: `/sosmed/${post.id}`,
  }));
}
