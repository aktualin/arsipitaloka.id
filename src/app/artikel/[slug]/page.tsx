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
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import {
  ARTICLE_AUTHOR,
  articleDescription,
  articleJsonLd,
  articleTypeLabel,
  articleTypeSlug,
} from "@/components/articles/article-seo";

type Props = { params: Promise<{ slug: string }> };

/** Judul ringkas untuk keywords (potong di batas kata, ±8 kata). */
function shortTitle(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 8) return title;
  return words.slice(0, 8).join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { slug } = await params;
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
    noIndex: !article.published,
  });
}

/**
 * `/artikel/<slug>` — halaman baca artikel (berita/blog/UMKM), pola blog.
 */
export default function ArticleDetailPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageLoader minHeight="60vh" />}>
        <ArticleDetailContent params={params} />
      </Suspense>
      <Footer />
    </>
  );
}

async function ArticleDetailContent({ params }: Props) {
  await connection();

  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });

  if (!article || !article.published) notFound();

  const typeSlug = articleTypeSlug(article.type);
  const typeLabel = articleTypeLabel(article.type);
  const articlePath = `/artikel/${article.slug}`;

  return (
    <>
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
