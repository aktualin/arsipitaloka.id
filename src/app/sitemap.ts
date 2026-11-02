import type { MetadataRoute } from "next";
import { cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SITE_TABS, BOOK_TAB_SLUG } from "@/lib/site-tabs";
import { absoluteUrl } from "@/lib/seo";

/**
 * Sitemap XML dinamis — seluruh halaman publik yang boleh diindeks.
 *
 * Isinya: beranda, katalog (semua + per kanal + per kategori), detail buku,
 * artikel, dokumentasi, media sosial, dan halaman statis.
 *
 * Halaman yang tidak ikut: area admin/pembeli, halaman auth, hasil pencarian
 * (`/cari`), dan nomor halaman katalog (&gt;1) — semuanya sudah ditandai
 * `noindex` atau tidak masuk akal untuk diindeks.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag("content");

  const [books, articles, docs, socials, categories] = await Promise.all([
    prisma.book.findMany({
      where: { archived: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
    prisma.documentation.findMany({
      where: { published: true },
      select: { slug: true, eventDate: true },
    }),
    prisma.socialMedia.findMany({
      where: { published: true },
      select: { id: true, updatedAt: true },
    }),
    prisma.category.findMany({
      select: { slug: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const now = new Date();

  const statis: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/buku"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    {
      url: absoluteUrl("/news-and-views"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/kontak"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/sosmed"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  // Kanal konten: hanya yang punya URL katalog sendiri.
  const kanal: MetadataRoute.Sitemap = SITE_TABS.filter(
    (tab) => tab.slug !== "dokumentasi",
  ).map((tab) => ({
    url: absoluteUrl(`/buku/${tab.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: tab.slug === BOOK_TAB_SLUG ? 0.9 : 0.7,
  }));

  // Kategori buku.
  const kategori: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/buku/kategori/${category.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const buku: MetadataRoute.Sitemap = books.map((book) => ({
    url: absoluteUrl(`/buku/${BOOK_TAB_SLUG}/${book.slug}`),
    lastModified: book.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const artikel: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/artikel/${article.slug}`),
    lastModified: article.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const dokumentasi: MetadataRoute.Sitemap = docs.map((doc) => ({
    url: absoluteUrl(`/dokumentasi/${doc.slug}`),
    lastModified: doc.eventDate,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  const mediaSosial: MetadataRoute.Sitemap = socials.map((post) => ({
    url: absoluteUrl(`/sosmed/${post.id}`),
    lastModified: post.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...statis, ...kanal, ...kategori, ...buku, ...artikel, ...dokumentasi, ...mediaSosial];
}
