import { Suspense } from "react";
import { connection } from "next/server";
import CatalogView from "@/components/books/CatalogView";
import PageLoader from "@/components/PageLoader";
import CatalogJsonLd from "@/components/books/marketplace/CatalogJsonLd";
import { listBookItems } from "@/components/books/marketplace/catalog-seo";
import {
  CATALOG_DESCRIPTION,
  catalogKeywords,
} from "@/components/books/marketplace/catalog-meta";
import { buildMetadata } from "@/lib/seo";

/**
 * Metadata statis: katalog semua buku.
 *
 * Canonical selalu `/buku` (tanpa query string) supaya halaman dengan
 * filter/paginasi (`?page=`, `?sort=`, `?q=`, …) tetap terindeks ke satu
 * URL utama. Pencarian (`?q=`) ditangani lewat canonical yang sama.
 */
export const metadata = buildMetadata({
  title: "Katalog Buku",
  description: CATALOG_DESCRIPTION,
  path: "/buku",
  keywords: catalogKeywords("katalog buku"),
});

type CatalogSearchParams = Record<string, string | string[] | undefined>;

/**
 * `/buku` — katalog semua buku.
 *
 * Tab & kategori memakai path (`/buku/<tab>`, `/buku/kategori/<slug>`);
 * pencarian, urutan, dan filter lain memakai query string (`?q=`, `?sort=`,
 * `?bahasa=`, `?hargaMin=`, `?hargaMax=`, `?rating=`, `?gratis=1`).
 */
export default function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-6 pt-12 md:px-10">
        <h1 className="font-sans text-4xl font-extrabold tracking-tight text-[#110f0d] md:text-5xl">
          E-Books Collections
        </h1>
      </section>
      <Suspense fallback={<PageLoader />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  await connection();
  const sp = await searchParams;

  // Data terstruktur: CollectionPage + breadcrumb + daftar buku (maks 20).
  const books = await listBookItems();

  return (
    <>
      <CatalogJsonLd
        name="Katalog Buku"
        description={CATALOG_DESCRIPTION}
        path="/buku"
        breadcrumbs={[
          { name: "Beranda", path: "/" },
          { name: "Katalog", path: "/buku" },
        ]}
        items={books}
      />
      <CatalogView
        page={typeof sp.page === "string" ? sp.page : undefined}
        per={typeof sp.per === "string" ? sp.per : undefined}
        showHeading={false}
        searchParams={sp}
      />
    </>
  );
}
