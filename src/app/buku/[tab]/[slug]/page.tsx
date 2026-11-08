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
import PreviewBanner from "@/components/preview/PreviewBanner";
import PageLoader from "@/components/PageLoader";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";
import { requireAdmin } from "@/lib/admin/require-admin";
import { previewBackHref } from "@/lib/admin/preview";
import { isPreviewRequested, type PreviewSearchParams } from "@/lib/preview";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ tab: string; slug: string }>;
  searchParams: Promise<PreviewSearchParams>;
};

/**
 * Metadata halaman detail buku — diambil dari data buku di DB.
 * Judul tanpa nama situs (template root layout yang menambahkannya).
 *
 * Halaman pratinjau (`?preview=1`) diberi `noindex`; canonical tetap
 * `/buku/e-book/<slug>` tanpa query string.
 */
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  return buildBookMetadata(await params, isPreviewRequested(sp));
}

async function buildBookMetadata(
  { slug }: { slug: string },
  isPreview: boolean,
): Promise<Metadata> {
  "use cache";
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
    noIndex: isPreview,
  });
}

/**
 * `/buku/<slug-tab>/<slug-buku>` — halaman detail buku.
 *
 * Semua buku adalah e-book; `tab` di URL hanya kosmetik. Kalau tab-nya bukan
 * "e-book", dialihkan ke URL kanonik supaya tidak ada tautan mati.
 *
 * Query `?preview=1` membuka mode pratinjau untuk admin (lihat
 * `PreviewBanner`). Buku tidak punya flag "belum tayang" seperti artikel —
 * penanda "tidak tayang"nya adalah `archived` (buku tidak masuk katalog),
 * dan halaman detailnya sendiri tetap terbuka seperti biasa.
 */
export default function BookDetailPage({ params, searchParams }: Props) {
  return (
    <>
      {/* Halaman detail tidak memakai gambar hero — navbarnya HTML
          (lihat `src/app/buku/layout.tsx`). */}
      <Suspense fallback={<PageLoader />}>
        <BookDetailContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BookDetailContent({ params, searchParams }: Props) {
  await connection();

  const { tab, slug } = await params;
  const sp = await searchParams;

  const book = await prisma.book.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!book) notFound();

  // Mode pratinjau hanya berlaku kalau pemintanya admin (cek server-side).
  const isPreview =
    isPreviewRequested(sp) && (await requireAdmin()) !== null;

  // URL kanonik buku selalu di bawah tab e-book.
  if (tab !== BOOK_TAB_SLUG) {
    return (
      <RedirectTo
        to={`/buku/${BOOK_TAB_SLUG}/${book.slug}${isPreview ? "?preview=1" : ""}`}
      />
    );
  }

  return (
    <>
      {isPreview ? (
        <PreviewBanner
          backHref={previewBackHref("book", book.id)}
          backLabel="Kembali ke admin"
          note={
            book.archived
              ? "Mode pratinjau — buku ini diarsipkan, jadi tidak tampil di katalog."
              : "Mode pratinjau — tampilannya sama dengan yang dilihat pengunjung."
          }
        />
      ) : null}
      {/* Structured data: `Book` + `BreadcrumbList`. */}
      <BookJsonLd slug={book.slug} />
      <BookDetailView book={book} />
    </>
  );
}
