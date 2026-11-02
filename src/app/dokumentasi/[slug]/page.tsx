import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import DocumentationDetailView from "@/components/docs/DocumentationDetailView";
import {
  documentationArticleJsonLd,
  documentationBreadcrumbItems,
  documentationPath,
} from "@/components/documentation/seo";
import PageLoader from "@/components/PageLoader";
import Footer from "@/components/home/Footer";
import SiteHeader from "@/components/layout/SiteHeader";

type Props = { params: Promise<{ slug: string }> };

/**
 * Metadata dinamis untuk halaman detail dokumentasi.
 *
 * `published === false` → `noIndex` supaya halaman draft tidak terindeks.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { slug } = await params;
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
    noIndex: !doc.published,
  });
}

/**
 * `/dokumentasi/<slug>` — halaman detail dokumentasi (pola blog).
 */
export default function DocumentationDetailPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageLoader minHeight="60vh" />}>
        <DocumentationDetailContent params={params} />
      </Suspense>
      <Footer />
    </>
  );
}

async function DocumentationDetailContent({ params }: Props) {
  await connection();

  const { slug } = await params;
  const doc = await prisma.documentation.findUnique({ where: { slug } });

  if (!doc || !doc.published) notFound();

  return (
    <>
      <JsonLd data={documentationArticleJsonLd(doc)} />
      <JsonLd data={breadcrumbJsonLd(documentationBreadcrumbItems(doc))} />
      <DocumentationDetailView doc={doc} />
    </>
  );
}
