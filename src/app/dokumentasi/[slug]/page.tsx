import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import DocumentationDetailView from "@/components/docs/DocumentationDetailView";
import PreviewBanner from "@/components/preview/PreviewBanner";
import {
  documentationArticleJsonLd,
  documentationBreadcrumbItems,
  documentationPath,
} from "@/components/documentation/seo";
import PageLoader from "@/components/PageLoader";
import Footer from "@/components/home/Footer";
import SiteHeader from "@/components/layout/SiteHeader";
import { requireAdmin } from "@/lib/admin/require-admin";
import { previewBackHref } from "@/lib/admin/preview";
import { isPreviewRequested, type PreviewSearchParams, canRenderContent } from "@/lib/preview";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<PreviewSearchParams>;
};

/**
 * Metadata dinamis untuk halaman detail dokumentasi.
 *
 * `published === false` → `noIndex` supaya halaman draft tidak terindeks.
 * Halaman pratinjau (`?preview=1`) juga `noIndex`.
 */
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  return buildDocumentationMetadata(
    await params,
    isPreviewRequested(sp),
  );
}

async function buildDocumentationMetadata(
  { slug }: { slug: string },
  isPreview: boolean,
): Promise<Metadata> {
  "use cache";
  const doc = await prisma.documentation.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      lead: true,
      photoUrl: true,
      eventDate: true,
      published: true,
    },
  });

  if (!doc) {
    return {
      title: "Dokumentasi",
      robots: { index: false, follow: false },
    };
  }

  return buildMetadata({
    title: doc.title,
    description: doc.lead,
    path: documentationPath(doc.slug),
    image: doc.photoUrl,
    type: "article",
    publishedTime: doc.eventDate,
    modifiedTime: doc.eventDate,
    authors: ["Rieke Diah Pitaloka"],
    keywords: ["dokumentasi", "arsip pitaloka", "kegiatan"],
    noIndex: !doc.published || isPreview,
  });
}

/**
 * `/dokumentasi/<slug>` — halaman detail dokumentasi (pola blog).
 *
 * Query `?preview=1` membuka mode pratinjau: dokumentasi yang belum tayang
 * hanya dirender untuk admin yang sudah login.
 */
export default function DocumentationDetailPage({
  params,
  searchParams,
}: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageLoader minHeight="60vh" />}>
        <DocumentationDetailContent
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
      <Footer />
    </>
  );
}

async function DocumentationDetailContent({ params, searchParams }: Props) {
  await connection();

  const { slug } = await params;
  const sp = await searchParams;

  const doc = await prisma.documentation.findUnique({ where: { slug } });

  if (!doc) notFound();

  // Mode pratinjau hanya berlaku kalau pemintanya admin (cek server-side).
  const isPreview =
    isPreviewRequested(sp) && (await requireAdmin()) !== null;

  // Belum tayang → 404 untuk semua orang kecuali admin yang mempratinjau.
  if (!canRenderContent({ isLive: doc.published, isPreview })) notFound();

  return (
    <>
      {isPreview ? (
        <PreviewBanner
          backHref={previewBackHref("documentation", doc.id)}
          backLabel="Kembali ke admin"
          note={
            doc.published
              ? "Mode pratinjau — dokumentasi ini sudah tayang untuk pengunjung."
              : "Dokumentasi ini belum tayang. Hanya admin yang bisa melihatnya lewat pratinjau ini."
          }
        />
      ) : null}
      <JsonLd data={documentationArticleJsonLd(doc)} />
      <JsonLd data={breadcrumbJsonLd(documentationBreadcrumbItems(doc))} />
      <DocumentationDetailView doc={doc} />
    </>
  );
}
