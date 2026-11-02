import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CatalogView from "@/components/books/CatalogView";
import SocialMediaCatalog from "@/components/social/SocialMediaCatalog";
import TikTokCatalog from "@/components/social/TikTokCatalog";
import PageLoader from "@/components/PageLoader";
import CatalogJsonLd from "@/components/books/marketplace/CatalogJsonLd";
import { listBookItems } from "@/components/books/marketplace/catalog-seo";
import {
  CATALOG_DESCRIPTION,
  catalogKeywords,
  categoryDescription,
} from "@/components/books/marketplace/catalog-meta";
import { buildMetadata } from "@/lib/seo";

/**
 * Kategori "social-media" tidak menampilkan katalog buku, melainkan grid
 * video media sosial dengan engagement + relasi (dikelola di /admin/social
 * dan /admin/profile). Slug-nya dikunci di sini supaya tidak diambil dari URL
 * sembarangan.
 */
const SOCIAL_MEDIA_CATEGORY_SLUG = "social-media";

/**
 * Kategori "#ViralForJustice" menampilkan curate video TikTok
 * (tabel `TiktokPost`) — sama dengan section #ViralForJustice di beranda.
 */
const VIRAL_FOR_JUSTICE_CATEGORY_SLUG = "viral-for-justice";

/**
 * Metadata kategori (cached per slug).
 *
 * Canonical selalu `/buku/kategori/<slug>` tanpa query string. Kategori
 * yang tidak ada di database memakai metadata generik + `noIndex`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  "use cache";
  const { slug } = await params;

  if (slug === SOCIAL_MEDIA_CATEGORY_SLUG) {
    return buildMetadata({
      title: "Media Sosial",
      description:
        "Koleksi video media sosial Arsip Pitaloka — ceramah, wawancara, dan dokumentasi karya Rieke Diah Pitaloka di YouTube dan TikTok.",
      path: `/buku/kategori/${slug}`,
      keywords: catalogKeywords("media sosial"),
    });
  }

  if (slug === VIRAL_FOR_JUSTICE_CATEGORY_SLUG) {
    return buildMetadata({
      title: "#ViralForJustice",
      description:
        "Koleksi video #ViralForJustice di Arsip Pitaloka — bagian dari gerakan Indonesia Bebas Korupsi dan Viral For Justice.",
      path: `/buku/kategori/${slug}`,
      keywords: catalogKeywords("#ViralForJustice"),
    });
  }

  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true },
  });

  if (!category) {
    return buildMetadata({
      title: "Kategori Buku",
      description: CATALOG_DESCRIPTION,
      path: `/buku/kategori/${slug}`,
      keywords: catalogKeywords("kategori buku"),
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `Kategori ${category.name}`,
    description: categoryDescription(category.name),
    path: `/buku/kategori/${slug}`,
    keywords: catalogKeywords(category.name),
  });
}

/** `/buku/kategori/<slug>` — katalog buku per kategori. */
export default function CategoryCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; per?: string }>;
}) {
  return (
    <>      <Suspense fallback={<PageLoader />}>
        <CategoryCatalogContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CategoryCatalogContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; per?: string }>;
}) {
  await connection();

  const { slug } = await params;
  const sp = await searchParams;

  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const basePath = `/buku/kategori/${slug}`;
  const breadcrumbs = [
    { name: "Beranda", path: "/" },
    { name: "Katalog", path: "/buku" },
    { name: category.name, path: basePath },
  ];

  if (slug === SOCIAL_MEDIA_CATEGORY_SLUG) {
    return (
      <>
        <CatalogJsonLd
          name="Media Sosial"
          description="Koleksi video media sosial Arsip Pitaloka — ceramah, wawancara, dan dokumentasi karya Rieke Diah Pitaloka di YouTube dan TikTok."
          path={basePath}
          breadcrumbs={breadcrumbs}
        />
        <SocialMediaCatalog
          basePath={basePath}
          page={sp.page}
          per={sp.per}
        />
      </>
    );
  }

  if (slug === VIRAL_FOR_JUSTICE_CATEGORY_SLUG) {
    return (
      <>
        <CatalogJsonLd
          name="#ViralForJustice"
          description="Koleksi video #ViralForJustice di Arsip Pitaloka — bagian dari gerakan Indonesia Bebas Korupsi dan Viral For Justice."
          path={basePath}
          breadcrumbs={breadcrumbs}
        />
        <TikTokCatalog basePath={basePath} page={sp.page} per={sp.per} />
      </>
    );
  }

  const books = await listBookItems({ categorySlug: slug });

  return (
    <>
      <CatalogJsonLd
        name={`Kategori ${category.name}`}
        description={categoryDescription(category.name)}
        path={basePath}
        breadcrumbs={breadcrumbs}
        items={books}
      />
      <CatalogView
        categorySlug={slug}
        page={sp.page}
        per={sp.per}
        searchParams={sp}
      />
    </>
  );
}
