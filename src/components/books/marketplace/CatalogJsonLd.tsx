import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

/**
 * JSON-LD untuk halaman katalog (`/buku`, `/buku/<tab>`,
 * `/buku/kategori/<slug>`).
 *
 * Setiap halaman katalog menghasilkan tiga skema:
 * - `CollectionPage` — halaman kanal/kategori itu sendiri,
 * - `BreadcrumbList` — jejak navigasi (Beranda → Katalog → …),
 * - `ItemList` — daftar isi yang tampil di halaman (opsional).
 *
 * Komponen ini murni server component dan hanya menulis `<script>` —
 * tidak mengubah tampilan halaman sama sekali.
 */

/** Satu butir breadcrumb (nama + path internal). */
export type CatalogBreadcrumb = {
  name: string;
  path: string;
};

/** Satu butir daftar isi (nama + path internal). */
export type CatalogItem = {
  name: string;
  path: string;
};

export default function CatalogJsonLd({
  name,
  description,
  path,
  breadcrumbs = [],
  items = [],
}: {
  /** Judul kanal/kategori (tanpa nama situs). */
  name: string;
  /** Deskripsi singkat halaman. */
  description: string;
  /** Path kanonik tanpa query string, mis. "/buku/e-book". */
  path: string;
  /** Jejak breadcrumb halaman ini. */
  breadcrumbs?: CatalogBreadcrumb[];
  /** Isi daftar (buku/artikel/video) — kosong = tanpa `ItemList`. */
  items?: CatalogItem[];
}) {
  const url = absoluteUrl(path);
  const breadcrumb = breadcrumbs.length ? breadcrumbJsonLd(breadcrumbs) : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name,
          description,
          url,
          inLanguage: "id-ID",
          isPartOf: {
            "@type": "WebSite",
            name: "Arsip Pitaloka",
            url: absoluteUrl("/"),
          },
          ...(breadcrumb ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
        }}
      />

      {breadcrumb ? (
        <JsonLd
          data={{
            ...breadcrumb,
            "@id": `${url}#breadcrumb`,
          }}
        />
      ) : null}

      {items.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name,
            numberOfItems: items.length,
            itemListElement: items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              url: absoluteUrl(item.path),
            })),
          }}
        />
      ) : null}
    </>
  );
}
