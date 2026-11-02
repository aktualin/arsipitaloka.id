/**
 * Helper SEO untuk halaman artikel (`/artikel/<slug>`).
 *
 * Berisi pembuatan JSON-LD `Article` + `BreadcrumbList` dan pemetaan
 * tipe artikel → label kanal. Dipisah dari page supaya halaman tetap
 * ramping dan helper bisa dipakai ulang.
 */

import { absoluteUrl, metaDescription, SITE_NAME } from "@/lib/seo";
import { siteTabLabel } from "@/lib/site-tabs";

/** Nama penulis konten artikel. */
export const ARTICLE_AUTHOR = "Rieke Diah Pitaloka";

/** Logo penerbit (dipakai di JSON-LD `publisher.logo`). */
export const PUBLISHER_LOGO = "/images/logo-pitaloka.png";

/** Slug kanal untuk setiap tipe artikel. */
const TYPE_TAB: Record<string, string> = {
  "berita-terkini": "berita-terkini",
  blog: "blog",
  umkm: "umkm",
};

/** Label kanal untuk tipe artikel (mis. "berita-terkini" → "Berita Terkini"). */
export function articleTypeLabel(type: string | null | undefined): string {
  if (!type) return "Berita Terkini";
  const slug = TYPE_TAB[type] ?? type;
  return siteTabLabel(slug) || type;
}

/** Slug kanal untuk tipe artikel. */
export function articleTypeSlug(type: string | null | undefined): string {
  if (!type) return "berita-terkini";
  return TYPE_TAB[type] ?? type;
}

/** Teks bersih dari HTML (untuk deskripsi meta & hitungan kata). */
export function plainText(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deskripsi artikel: excerpt kalau ada, kalau tidak dari isi body. */
export function articleDescription(article: {
  excerpt?: string | null;
  body?: string | null;
}): string {
  const excerpt = plainText(article.excerpt);
  if (excerpt) return metaDescription(excerpt);
  return metaDescription(plainText(article.body));
}

/** Jumlah kata pada isi artikel (untuk `wordCount` JSON-LD). */
export function articleWordCount(body: string | null | undefined): number {
  const text = plainText(body);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** Data artikel untuk penyusunan SEO. */
export type ArticleSeoData = {
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  coverUrl?: string | null;
  type?: string | null;
  published: boolean;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
};

/** JSON-LD `Article` untuk satu artikel. */
export function articleJsonLd(article: ArticleSeoData) {
  const path = `/artikel/${article.slug}`;
  const url = absoluteUrl(path);
  const description = articleDescription(article);
  const words = articleWordCount(article.body);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: article.title,
    description,
    image: article.coverUrl ? [absoluteUrl(article.coverUrl)] : [],
    datePublished: article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : undefined,
    dateModified: article.updatedAt
      ? new Date(article.updatedAt).toISOString()
      : undefined,
    author: {
      "@type": "Person",
      name: ARTICLE_AUTHOR,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(PUBLISHER_LOGO),
      },
    },
    inLanguage: "id-ID",
    articleSection: articleTypeLabel(article.type),
    isAccessibleForFree: true,
    ...(words ? { wordCount: words } : {}),
  };
}
