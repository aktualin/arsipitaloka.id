import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ArticleDetailView from "@/components/articles/ArticleDetailView";
import PageLoader from "@/components/PageLoader";
import Footer from "@/components/home/Footer";
import SiteHeader from "@/components/layout/SiteHeader";
import JsonLd from "@/components/seo/JsonLd";
import PreviewBanner from "@/components/preview/PreviewBanner";
import { requireAdmin } from "@/lib/admin/require-admin";
import { previewBackHref } from "@/lib/admin/preview";
import { isPreviewRequested, type PreviewSearchParams, canRenderContent } from "@/lib/preview";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import {
  ARTICLE_AUTHOR,
  articleDescription,
  articleJsonLd,
  articleTypeLabel,
  articleTypeSlug,
} from "@/components/articles/article-seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<PreviewSearchParams>;
};

/** Judul ringkas untuk keywords (potong di batas kata, ±8 kata). */
function shortTitle(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 8) return title;
  return words.slice(0, 8).join(" ");
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  return buildArticleMetadata(
    await params,
    isPreviewRequested(sp),
  );
}

/**
 * Metadata artikel (cached per slug + status pratinjau).
 *
 * Artikel yang belum dipublikasikan tidak boleh diindeks. Halaman
 * pratinjau (`?preview=1`) juga `noindex` supaya tidak jadi URL duplikat —
 * canonical tetap `/artikel/<slug>` tanpa query string.
 */
async function buildArticleMetadata(
  { slug }: { slug: string },
  isPreview: boolean,
): Promise<Metadata> {
  "use cache";
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      coverUrl: true,
      type: true,
      published: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (!article) {
    return buildMetadata({
      title: "Artikel tidak ditemukan",
      description: "Artikel yang Anda cari tidak tersedia.",
      path: `/artikel/${slug}`,
      noIndex: true,
    });
  }

  const typeLabel = articleTypeLabel(article.type);

  return buildMetadata({
    title: article.title,
    description: articleDescription(article),
    path: `/artikel/${article.slug}`,
    image: article.coverUrl,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
    authors: [ARTICLE_AUTHOR],
    keywords: [typeLabel, shortTitle(article.title)],
    // Artikel yang belum dipublikasikan tidak boleh diindeks.
    noIndex: !article.published || isPreview,
  });
}

/**
 * `/artikel/<slug>` — halaman baca artikel (berita/blog/UMKM), pola blog.
 *
 * Query `?preview=1` membuka mode pratinjau: konten yang belum tayang
 * hanya dirender untuk admin yang sudah login. Pengunjung biasa tetap
 * mendapat 404 seperti sebelumnya.
 */
export default function ArticleDetailPage({ params, searchParams }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageLoader minHeight="60vh" />}>
        <ArticleDetailContent params={params} searchParams={searchParams} />
      </Suspense>
      <Footer />
    </>
  );
}

async function ArticleDetailContent({ params, searchParams }: Props) {
  await connection();

  const { slug } = await params;
  const sp = await searchParams;

  const article = await prisma.article.findUnique({ where: { slug } });

  if (!article) notFound();

  // Mode pratinjau hanya berlaku kalau pemintanya admin (cek server-side).
  const isPreview =
    isPreviewRequested(sp) && (await requireAdmin()) !== null;

  // Konten yang belum tayang: 404 untuk semua orang kecuali admin yang
  // sedang mempratinjau.
  if (!canRenderContent({ isLive: article.published, isPreview })) notFound();

  const typeSlug = articleTypeSlug(article.type);
  const typeLabel = articleTypeLabel(article.type);
  const articlePath = `/artikel/${article.slug}`;

  return (
    <>
      {isPreview ? (
        <PreviewBanner
          backHref={previewBackHref("article", article.id)}
          backLabel="Kembali ke admin"
          note={
            article.published
              ? "Mode pratinjau — konten ini sudah tayang untuk pengunjung."
              : "Konten ini belum tayang. Hanya admin yang bisa melihatnya lewat pratinjau ini."
          }
        />
      ) : null}
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Beranda", path: "/" },
          { name: "News & Views", path: "/news-and-views" },
          { name: typeLabel, path: `/buku/${typeSlug}` },
          { name: article.title, path: articlePath },
        ])}
      />
      <ArticleDetailView article={article} />
    </>
  );
}
