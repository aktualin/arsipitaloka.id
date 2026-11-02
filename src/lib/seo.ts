import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * Helper SEO bersama untuk seluruh halaman publik.
 *
 * Satu sumber kebenaran supaya setiap halaman punya metadata yang konsisten:
 * judul, deskripsi, URL kanonik, Open Graph, Twitter Card, danrobots.
 *
 * Aturan:
 * - `title` di halaman TIDAK boleh memuat nama situs — root layout sudah
 *   memakai `title.template` ("%s — Arsip Pitaloka").
 * - Deskripsi dipotong otomatis ke ±160 karakter (batas ideal mesin pencari).
 * - Canonical selalu absolut (https://arsippitaloka.com/...) supaya tidak
 *   ambigu ketika situs diakses lewat domain lain.
 */

/** Nama situs untuk Open Graph & Twitter. */
export const SITE_NAME = "Arsip Pitaloka";

/** Gambar OG bawaan (1200×630). */
export const DEFAULT_OG_IMAGE = "/images/og-default.jpg";

/** Bahasa utama situs. */
export const SITE_LOCALE = "id_ID";

/** URL absolut dari path internal ("/buku" → "https://arsippitaloka.com/buku"). */
export function absoluteUrl(path: string): string {
  if (!path) return siteUrl();
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Deskripsi meta: rapikan spasi, buang sisa HTML, potong ±160 karakter di
 * batas kata (bukan di tengah kata).
 */
export function metaDescription(text: string, max = 160): string {
  const clean = (text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 60 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim().replace(/[.,;:—-]+$/, "")}…`;
}

/** Opsi untuk `buildMetadata`. */
export type SeoOptions = {
  /** Judul halaman (tanpa nama situs). */
  title: string;
  /** Deskripsi halaman (dipotong otomatis). */
  description?: string;
  /** Path kanonik, mis. "/buku/e-book/ups". */
  path?: string;
  /** Gambar OG (path internal atau URL absolut). */
  image?: string | null;
  /** Tipe Open Graph. */
  type?: "website" | "article" | "book";
  /** Waktu terbit (konten). */
  publishedTime?: Date | string | null;
  /** Waktu terakhir diubah (konten). */
  modifiedTime?: Date | string | null;
  /** Penulis konten. */
  authors?: string[];
  /** Kata kunci. */
  keywords?: string[];
  /** Jangan diindeks (halaman auth, pencarian, dll). */
  noIndex?: boolean;
};

/**
 * Metadata lengkap untuk satu halaman: title, description, canonical,
 * Open Graph, Twitter Card, dan robots.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  keywords,
  noIndex = false,
}: SeoOptions): Metadata {
  const url = path ? absoluteUrl(path) : undefined;
  const imageUrl = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const desc = description ? metaDescription(description) : undefined;

  return {
    title,
    description: desc,
    ...(url ? { alternates: { canonical: url } } : {}),
    ...(keywords?.length ? { keywords } : {}),
    ...(authors?.length
      ? { authors: authors.map((name) => ({ name })) }
      : {}),
    openGraph: {
      type: type === "book" ? "website" : type,
      title,
      ...(desc ? { description: desc } : {}),
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      ...(publishedTime
        ? { publishedTime: toIso(publishedTime) }
        : {}),
      ...(modifiedTime ? { modifiedTime: toIso(modifiedTime) } : {}),
      ...(authors?.length ? { authors } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(desc ? { description: desc } : {}),
      images: [imageUrl],
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Satu butir breadcrumb. */
export type BreadcrumbItem = {
  name: string;
  /** Path internal ("/buku/e-book/ups"). */
  path: string;
};

/** JSON-LD `BreadcrumbList` untuk halaman detail. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** JSON-LD `Organization` untuk situs ini. */
export function organizationJsonLd(settings: Record<string, string>) {
  const social = [
    settings["company.social.youtube"],
    settings["company.social.tiktok"],
    settings["company.social.instagram"],
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: settings["company.name"] ?? "Pitaloka",
    url: siteUrl(),
    logo: absoluteUrl(settings["company.logoUrl"] || "/images/logo-pitaloka.png"),
    description:
      settings["company.description"] ??
      "Arsip, dokumentasi, dan e-book karya Rieke Diah Pitaloka.",
    email: settings["company.email"] || undefined,
    telephone: settings["company.phone"] || undefined,
    address: settings["company.address"]
      ? {
          "@type": "PostalAddress",
          addressLocality: settings["company.address"],
          addressCountry: "ID",
        }
      : undefined,
    sameAs: social.length ? social : undefined,
  };
}

/** JSON-LD `WebSite` (+ `SearchAction` untuk kotak pencarian). */
export function websiteJsonLd(settings: Record<string, string>) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl(),
    inLanguage: "id-ID",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: absoluteUrl(
        settings["company.logoUrl"] || "/images/logo-pitaloka.png",
      ),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl()}/cari?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
