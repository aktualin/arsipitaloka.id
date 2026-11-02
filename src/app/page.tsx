import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import MobileHeroSearch from "@/components/home/MobileHeroSearch";
import FeatureCategories from "@/components/home/FeatureCategories";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import ViralForJustice from "@/components/home/ViralForJustice";
import DocumentationSection from "@/components/home/DocumentationSection";
import CtaBanner from "@/components/home/CtaBanner";
import Footer from "@/components/home/Footer";
import SiteHeader from "@/components/layout/SiteHeader";
import PageJsonLd from "@/components/seo/PageJsonLd";
import { absoluteUrl, buildMetadata, SITE_NAME } from "@/lib/seo";
import { SITE_TABS } from "@/lib/site-tabs";

/** Kontainer konten beranda — memberi padding konsisten di semua layar & membatasi lebar maksimum agar tetap rapi pada layar besar. */
const CONTENT_MAX = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

const HOME_DESCRIPTION =
  "Arsip Pitaloka adalah pustaka digital karya Rieke Diah Pitaloka: e-book, berita terkini, blog, UMKM, video YouTube & TikTok, serta dokumentasi dalam satu genggaman.";

export const metadata: Metadata = buildMetadata({
  title: "Arsip, Dokumentasi & E-Book",
  description: HOME_DESCRIPTION,
  path: "/",
  keywords: [
    "Arsip Pitaloka",
    "Rieke Diah Pitaloka",
    "e-book Pitaloka",
    "arsip digital",
    "dokumentasi",
    "berita terkini",
    "UMKM",
  ],
});

/**
 * Data terstruktur beranda: halaman kumpulan (`CollectionPage`) dengan
 * `ItemList` berisi kanal konten yang tersedia.
 *
 * Daftar kanal diambil dari `SITE_TABS` (sumber kebenaran kanal konten),
 * jadi JSON-LD selalu sinkron dengan navigasi situs.
 */
const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Arsip, Dokumentasi & E-Book",
  description: HOME_DESCRIPTION,
  url: absoluteUrl("/"),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
  },
  mainEntity: {
    "@type": "ItemList",
    name: "Kanal Konten Arsip Pitaloka",
    numberOfItems: SITE_TABS.length,
    itemListElement: SITE_TABS.map((tab, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tab.label,
      url: absoluteUrl(`/buku/${tab.slug}`),
    })),
  },
};

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <PageJsonLd data={HOME_JSON_LD} />
      {/* Hero penuh lebar tanpa container (gambar PDF sudah full). */}
      <Hero />

      {/* Pencarian — hanya di mobile, karena di desktop sudah ada di gambar hero. */}
      <MobileHeroSearch />

      {/* Section terkontrol oleh max-width & spacing konsisten mobile. */}
      <section className={CONTENT_MAX}>
        <FeatureCategories />
        <FeaturedCourses />
      </section>

      {/* Viral for Justice & dokumentasi bisa full-width atau terkontainer sesuai kebutuhan desain. */}
      <ViralForJustice />
      <DocumentationSection />

      {/* CTA banner penuh lebar. */}
      <CtaBanner />

      {/* Footer penuh lebar. */}
      <Footer />
    </div>
  );
}
