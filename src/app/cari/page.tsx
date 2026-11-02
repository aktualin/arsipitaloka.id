import { Suspense } from "react";
import type { Metadata } from "next";
import CariContent from "./cari-content";
import Footer from "@/components/home/Footer";
import SiteHeader from "@/components/layout/SiteHeader";
import { buildMetadata } from "@/lib/seo";

/**
 * `/cari?q=<kata kunci>` — hasil pencarian global.
 *
 * Halaman ini membaca `searchParams`, jadi TIDAK bisa memakai `"use cache"`.
 * Pola repo: komponen default (synchronous) membungkus isi dinamis dengan
 * `<Suspense>`, lalu komponen async di dalamnya memanggil `await connection()`.
 *
 * Hasil pencarian tidak pernah diindeks (canonical tetap `/cari` tanpa query)
 * supaya tidak memunculkan banyak URL tipis di hasil pencarian.
 */
export const metadata: Metadata = buildMetadata({
  title: "Pencarian",
  description:
    "Cari buku, artikel, video, dan dokumentasi di Arsip Pitaloka.",
  path: "/cari",
  noIndex: true,
});

export default function CariPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-screen flex-col">
        <Suspense fallback={<CariSkeleton />}>
          <CariContent searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

/** Placeholder selagi data diambil ( Suspense fallback ). */
function CariSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-12">
      <div className="h-7 w-40 animate-pulse rounded bg-neutral-100 sm:h-8 sm:w-48" />
      <div className="mt-5 h-11 w-full animate-pulse rounded-full bg-neutral-100 sm:h-14" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-xl bg-neutral-100 sm:h-72"
          />
        ))}
      </div>
    </div>
  );
}
