import JsonLd from "@/components/seo/JsonLd";

/**
 * JSON-LD tingkat halaman.
 *
 * Membungkus satu atau beberapa objek schema.org menjadi `<script
 * type="application/ld+json">`. Dipakai di halaman yang butuh data
 * terstruktur sendiri (CollectionPage, AboutPage, ContactPage, VideoObject,
 * BreadcrumbList, dst).
 *
 * Catatan: `Organization` & `WebSite` sudah dipasang di root layout
 * (`SiteJsonLd`) — jangan diduplikasi di sini.
 */
export default function PageJsonLd({
  data,
}: {
  data: unknown | unknown[];
}) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, index) => (
        <JsonLd key={index} data={item} />
      ))}
    </>
  );
}
