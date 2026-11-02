import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl, breadcrumbJsonLd, metaDescription } from "@/lib/seo";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";
import { prisma } from "@/lib/prisma";

/**
 * Data buku untuk keperluan SEO — bentuknya sudah "plain" (tanpa Decimal,
 * tanpa relasi Prisma) supaya aman disimpan di cache `"use cache"`.
 */
export type BookSeoData = {
  slug: string;
  title: string;
  description: string | null;
  author: string;
  publisher: string | null;
  publishedYear: number | null;
  isbn: string | null;
  language: string;
  pages: number;
  fileFormat: string | null;
  coverUrl: string | null;
  isFree: boolean;
  /** Harga dalam Rupiah penuh (angka, tanpa pemisah ribuan). */
  price: number;
  categoryName: string | null;
};

/**
 * Ambil satu buku untuk metadata & structured data.
 *
 * Sengaja memakai `select` + konversi manual: `priceUsd` di Prisma bertipe
 * `Decimal` (class, tidak bisa diserialisasi ke cache), jadi di sini
 * diubah jadi angka biasa.
 */
export async function getBookSeoData(slug: string): Promise<BookSeoData | null> {
  "use cache";

  const book = await prisma.book.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      description: true,
      author: true,
      publisher: true,
      publishedYear: true,
      isbn: true,
      language: true,
      pages: true,
      fileFormat: true,
      coverUrl: true,
      isFree: true,
      priceUsd: true,
      category: { select: { name: true } },
    },
  });

  if (!book) return null;

  return {
    slug: book.slug,
    title: book.title,
    description: book.description,
    author: book.author,
    publisher: book.publisher,
    publishedYear: book.publishedYear,
    isbn: book.isbn,
    language: book.language,
    pages: book.pages,
    fileFormat: book.fileFormat,
    coverUrl: book.coverUrl,
    isFree: book.isFree,
    price: book.isFree ? 0 : Math.round(Number(book.priceUsd ?? 0)),
    categoryName: book.category?.name ?? null,
  };
}

/** Path kanonik buku — selalu di bawah tab e-book. */
export function bookCanonicalPath(slug: string): string {
  return `/buku/${BOOK_TAB_SLUG}/${slug}`;
}

/** Buang markup HTML lalu rapikan spasi. */
function stripHtml(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deskripsi meta untuk halaman detail buku.
 * Kalau `book.description` kosong, susun dari author + halaman + kategori +
 * penerbit.
 */
export function bookMetaDescription(book: BookSeoData): string {
  const fromDescription = stripHtml(book.description);
  if (fromDescription) return metaDescription(fromDescription);

  const bagian = [
    `Buku digital karya ${book.author}`,
    `${book.pages} halaman`,
    book.categoryName,
    book.publisher ? `terbit ${book.publisher}` : null,
    book.publishedYear ? `${book.publishedYear}` : null,
  ].filter(Boolean);

  return metaDescription(bagian.join(" · "));
}

/** Kata kunci halaman detail buku. */
export function bookKeywords(book: BookSeoData): string[] {
  const keywords = [
    book.title,
    book.author,
    book.categoryName,
    book.language,
    "e-book",
    "Arsip Pitaloka",
  ].filter((v): v is string => Boolean(v));

  return Array.from(new Set(keywords));
}

/** Tanggal terbit format ISO (tahun saja → 1 Januari). */
function publishedDate(year: number | null): string | undefined {
  return year ? `${year}-01-01` : undefined;
}

/** Kode bahasa schema.org ("Indonesia" → "id-ID"). */
function schemaLanguage(language: string | null | undefined): string {
  const lang = (language ?? "").toLowerCase();
  if (!lang) return "id-ID";
  if (lang.includes("indonesia") || lang === "id" || lang === "in") return "id-ID";
  if (lang.includes("english") || lang === "en") return "en";
  return language as string;
}

/** Nilai `bookFormat` schema.org. */
function schemaBookFormat(fileFormat: string | null | undefined): string | undefined {
  const fmt = (fileFormat ?? "").trim();
  if (!fmt) return undefined;
  const lower = fmt.toLowerCase();
  if (lower.includes("pdf") || lower.includes("epub")) return "EBook";
  if (lower.includes("print") || lower.includes("hardcover")) return "Hardcover";
  if (lower.includes("paper")) return "Paperback";
  return fmt;
}

/**
 * JSON-LD `Book` untuk halaman detail buku.
 *
 * Buku gratis → `offers.price` = 0, `availability` InStock, plus
 * `isAccessibleForFree`. Buku berbayar → harga Rupiah penuh (angka) dan
 * `availability` PreOrder.
 */
export function bookJsonLd(book: BookSeoData) {
  const url = absoluteUrl(bookCanonicalPath(book.slug));
  const description = stripHtml(book.description) || bookMetaDescription(book);

  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    url,
    ...(description ? { description } : {}),
    author: {
      "@type": "Person",
      name: book.author,
    },
    ...(book.isbn ? { isbn: book.isbn } : {}),
    ...(book.pages ? { numberOfPages: book.pages } : {}),
    ...(book.publisher
      ? { publisher: { "@type": "Organization", name: book.publisher } }
      : {}),
    ...(publishedDate(book.publishedYear)
      ? { datePublished: publishedDate(book.publishedYear) }
      : {}),
    inLanguage: schemaLanguage(book.language),
    ...(schemaBookFormat(book.fileFormat)
      ? { bookFormat: schemaBookFormat(book.fileFormat) }
      : {}),
    ...(book.coverUrl ? { image: absoluteUrl(book.coverUrl) } : {}),
    ...(book.categoryName ? { genre: book.categoryName } : {}),
    ...(book.isFree ? { isAccessibleForFree: true } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: book.price,
      priceCurrency: "IDR",
      availability: book.isFree
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
    },
  };
}

/** JSON-LD `BreadcrumbList` halaman detail buku. */
export function bookBreadcrumbJsonLd(book: BookSeoData) {
  return breadcrumbJsonLd([
    { name: "Beranda", path: "/" },
    { name: "Katalog", path: "/buku" },
    { name: "E-Book", path: `/buku/${BOOK_TAB_SLUG}` },
    { name: book.title, path: bookCanonicalPath(book.slug) },
  ]);
}

/**
 * Structured data halaman detail buku: `Book` + `BreadcrumbList`.
 *
 * Server Component — aman dipakai di dalam JSX server.
 */
export default async function BookJsonLd({ slug }: { slug: string }) {
  const book = await getBookSeoData(slug);
  if (!book) return null;

  return (
    <>
      <JsonLd data={bookJsonLd(book)} />
      <JsonLd data={bookBreadcrumbJsonLd(book)} />
    </>
  );
}
