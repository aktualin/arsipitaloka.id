import { absoluteUrl, metaDescription, SITE_NAME } from "@/lib/seo";

/**
 * Helper SEO khusus halaman dokumentasi (`/dokumentasi/<slug>`).
 *
 * Dokumentasi adalah catatan kegiatan/archivum: pola isi resembled artikel,
 * jadi JSON-LD memakai `Article` (dengan `CreativeWork` sebagai
 * `about`/konteks tambahan).
 */

/** Data dokumentasi yang dipakai untuk membangun structured data. */
export type DocumentationSeoData = {
  slug: string;
  title: string;
  lead: string;
  photoUrl?: string | null;
  eventDate: Date | string;
};

/** Path kanonik halaman detail dokumentasi. */
export function documentationPath(slug: string): string {
  return `/dokumentasi/${slug}`;
}

/** URL absolut logo publisher. */
export function publisherLogo(): string {
  return absoluteUrl("/images/logo-pitaloka.png");
}

/**
 * JSON-LD `Article` untuk satu halaman dokumentasi.
 *
 * Memuat: headline, description, image, datePublished, author, publisher,
 * mainEntityOfPage, inLanguage, keywords, genre, dan `about` (konteks
 * arsip/kegiatan).
 */
export function documentationArticleJsonLd(doc: DocumentationSeoData) {
  const url = absoluteUrl(documentationPath(doc.slug));
  const image = doc.photoUrl ? absoluteUrl(doc.photoUrl) : undefined;
  const published = new Date(doc.eventDate);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: doc.title,
    description: metaDescription(doc.lead),
    ...(image ? { image } : {}),
    datePublished: published.toISOString(),
    dateModified: published.toISOString(),
    author: {
      "@type": "Person",
      name: "Rieke Diah Pitaloka",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: publisherLogo(),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "id-ID",
    keywords: ["dokumentasi", "arsip pitaloka", "kegiatan", "Rieke Diah Pitaloka"],
    genre: "Dokumentasi kegiatan",
    about: {
      "@type": "Thing",
      name: "Arsip kegiatan Rieke Diah Pitaloka",
      description:
        "Catatan dan arsip kegiatan Rieke Diah Pitaloka, anggota DPR RI dan penulis.",
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

/** Breadcrumb halaman detail dokumentasi. */
export function documentationBreadcrumbItems(doc: {
  title: string;
  slug: string;
}) {
  return [
    { name: "Beranda", path: "/" },
    { name: "News & Views", path: "/news-and-views" },
    { name: "Dokumentasi", path: "/buku/dokumentasi" },
    { name: doc.title, path: documentationPath(doc.slug) },
  ];
}
