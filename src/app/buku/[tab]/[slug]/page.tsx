import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import BookDetailView from "@/components/books/BookDetailView";
import BookJsonLd, {
  bookCanonicalPath,
  bookKeywords,
  bookMetaDescription,
  getBookSeoData,
} from "@/components/books/BookJsonLd";
import RedirectTo from "@/components/books/RedirectTo";
import PageLoader from "@/components/PageLoader";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ tab: string; slug: string }> };

/**
 * Metadata halaman detail buku — diambil dari data buku di DB.
 * Judul tanpa nama situs (template root layout yang menambahkannya).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { slug } = await params;
  const book = await getBookSeoData(slug);

  if (!book) {
    return {
      title: "Buku tidak ditemukan",
      robots: { index: false, follow: false },
    };
  }

  return buildMetadata({
    title: book.title,
    description: bookMetaDescription(book),
    path: bookCanonicalPath(book.slug),
    image: book.coverUrl,
    type: "book",
    publishedTime: book.publishedYear ? `${book.publishedYear}-01-01` : null,
    authors: book.author ? [book.author] : [],
    keywords: bookKeywords(book),
  });
}

/**
 * `/buku/<slug-tab>/<slug-buku>` — halaman detail buku.
 *
 * Semua buku adalah e-book; `tab` di URL hanya kosmetik. Kalau tab-nya bukan
 * "e-book", dialihkan ke URL kanonik supaya tidak ada tautan mati.
 */
export default function BookDetailPage({
  params,
}: {
  params: Promise<{ tab: string; slug: string }>;
}) {
  return (
    <>
      {/* Halaman detail tidak memakai gambar hero — navbarnya HTML
          (lihat `src/app/buku/layout.tsx`). */}
      <Suspense fallback={<PageLoader />}>
        <BookDetailContent params={params} />
      </Suspense>
    </>
  );
}

async function BookDetailContent({
  params,
}: {
  params: Promise<{ tab: string; slug: string }>;
}) {
  await connection();

  const { tab, slug } = await params;

  const book = await prisma.book.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!book) notFound();

  // URL kanonik buku selalu di bawah tab e-book.
  if (tab !== BOOK_TAB_SLUG) {
    return <RedirectTo to={`/buku/${BOOK_TAB_SLUG}/${book.slug}`} />;
  }

  return (
    <>
      {/* Structured data: `Book` + `BreadcrumbList`. */}
      <BookJsonLd slug={book.slug} />
      <BookDetailView book={book} />
    </>
  );
}
