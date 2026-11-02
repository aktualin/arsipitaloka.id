import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CatalogView from "@/components/books/CatalogView";
import ArticleCatalog from "@/components/articles/ArticleCatalog";
import SocialMediaCatalog from "@/components/social/SocialMediaCatalog";
import TikTokCatalog from "@/components/social/TikTokCatalog";
import RedirectTo from "@/components/books/RedirectTo";
import PageLoader from "@/components/PageLoader";
import CatalogJsonLd from "@/components/books/marketplace/CatalogJsonLd";
import {
  listArticleItems,
  listBookItems,
  listSocialMediaItems,
} from "@/components/books/marketplace/catalog-seo";
import {
  CATALOG_DESCRIPTION,
  catalogKeywords,
  tabDescription,
} from "@/components/books/marketplace/catalog-meta";
import { buildMetadata } from "@/lib/seo";
import { getSiteTab, BOOK_TAB_SLUG } from "@/lib/site-tabs";

/**
 * `/buku/<slug-tab>` — kanal konten per tab.
 *
 * Tab bersifat statis (`src/lib/site-tabs.ts`) dan isinya beragam:
 * - e-book            → katalog buku (produk)
 * - berita/blog/umkm  → daftar artikel (bebas baca, tanpa harga)
 * - youtube/tiktok    → katalog video
 * - dokumentasi       → dialihkan ke News & Views
 *
 * Metadata kanal dibuat per slug tab (cached) — canonical selalu
 * `/buku/<tab>` tanpa query string, jadi paginasi & filter tidak
 * pecah jadi URL terpisah.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  "use cache";
  const { tab } = await params;
  const def = getSiteTab(tab);

  // Slug yang bukan kanal (kemungkinan slug buku versi lama).
  if (!def) {
    return buildMetadata({
      title: "Katalog Buku",
      description: CATALOG_DESCRIPTION,
      path: "/buku",
      keywords: catalogKeywords("katalog buku"),
      noIndex: true,
    });
  }

  // Kanal dokumentasi memang dialihkan ke News & Views.
  if (def.kind === "docs") {
    return buildMetadata({
      title: def.label,
      description: tabDescription(def.slug),
      path: "/news-and-views",
      keywords: catalogKeywords(def.label),
      noIndex: true,
    });
  }

  return buildMetadata({
    title: def.label,
    description: tabDescription(def.slug),
    path: `/buku/${def.slug}`,
    keywords: catalogKeywords(def.label),
  });
}

export default function TabCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ page?: string; per?: string }>;
}) {
  return (
    <>      <Suspense fallback={<PageLoader />}>
        <TabCatalogContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TabCatalogContent({
  params,
  searchParams,
}: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ page?: string; per?: string }>;
}) {
  await connection();

  const { tab } = await params;
  const sp = await searchParams;
  const def = getSiteTab(tab);

  if (!def) {
    // Mungkin ini slug buku (URL lama) → arahkan ke path lengkap.
    const book = await prisma.book.findUnique({
      where: { slug: tab },
      select: { slug: true },
    });
    if (book) {
      return <RedirectTo to={`/buku/${BOOK_TAB_SLUG}/${book.slug}`} />;
    }
    notFound();
  }

  if (def.kind === "docs") {
    return <RedirectTo to="/news-and-views" />;
  }

  const basePath = `/buku/${tab}`;
  const description = tabDescription(def.slug);
  const breadcrumbs = [
    { name: "Beranda", path: "/" },
    { name: "Katalog", path: "/buku" },
    { name: def.label, path: basePath },
  ];

  if (def.kind === "articles") {
    const articles = await listArticleItems(def.articleType!);
    return (
      <>
        <CatalogJsonLd
          name={def.label}
          description={description}
          path={basePath}
          breadcrumbs={breadcrumbs}
          items={articles}
        />
        <ArticleCatalog
          type={def.articleType!}
          heading={def.label}
          basePath={basePath}
          page={sp.page}
          per={sp.per}
        />
      </>
    );
  }

  if (def.kind === "social") {
    // TikTok tidak punya halaman detail internal — tanpa `ItemList`.
    const videos =
      def.platform === "youtube"
        ? await listSocialMediaItems("youtube")
        : [];

    return (
      <>
        <CatalogJsonLd
          name={def.label}
          description={description}
          path={basePath}
          breadcrumbs={breadcrumbs}
          items={videos}
        />
        {def.platform === "tiktok" ? (
          <TikTokCatalog basePath={basePath} page={sp.page} per={sp.per} />
        ) : (
          <SocialMediaCatalog
            basePath={basePath}
            page={sp.page}
            per={sp.per}
            platform={def.platform}
          />
        )}
      </>
    );
  }

  const books = await listBookItems();

  return (
    <>
      <CatalogJsonLd
        name={def.label}
        description={description}
        path={basePath}
        breadcrumbs={breadcrumbs}
        items={books}
      />
      <CatalogView tabSlug={tab} page={sp.page} per={sp.per} searchParams={sp} />
    </>
  );
}
