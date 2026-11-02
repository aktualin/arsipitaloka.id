import type { Metadata } from "next";
import PdfHero from "@/components/layout/PdfHero";
import SearchBar from "@/components/search/SearchBar";
import { SPLIT_NAVBAR_CROP_PT, SPLIT_NAV_ZONES } from "@/components/layout/split-nav";
import YoutubeBand from "@/components/news/YoutubeBand";
import ViralForJustice from "@/components/home/ViralForJustice";
import DocumentationSection from "@/components/home/DocumentationSection";
import Footer from "@/components/home/Footer";
import SiteHeader from "@/components/layout/SiteHeader";
import PageJsonLd from "@/components/seo/PageJsonLd";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  SITE_NAME,
} from "@/lib/seo";

const NEWS_DESCRIPTION =
  "News & Views Pitaloka: berita terkini, artikel blog, UMKM, video YouTube & TikTok, serta dokumentasi kegiatan — “What's Trending, What's True”.";

export const metadata: Metadata = buildMetadata({
  title: "News & Views",
  description: NEWS_DESCRIPTION,
  path: "/news-and-views",
  image: "/images/news-hero.jpg",
  keywords: [
    "berita terkini",
    "news and views",
    "artikel Pitaloka",
    "video YouTube Pitaloka",
    "TikTok Pitaloka",
  ],
});

/** Data terstruktur halaman: kumpulan konten + breadcrumb. */
const NEWS_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "News & Views",
    description: NEWS_DESCRIPTION,
    url: absoluteUrl("/news-and-views"),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  },
  breadcrumbJsonLd([
    { name: "Beranda", path: "/" },
    { name: "News & Views", path: "/news-and-views" },
  ]),
];

/**
 * Halaman News & Views (referensi desain: `references/layouts/split/MENU News & Views.pdf`).
 *
 * Hero memakai potongan render PDF (`public/images/news-hero.jpg`, 2400×1230 px
 * = 1920×984 pt kanvas PDF). Semua teks hero — navbar, judul, dan subjudul —
 * sudah menyatu di dalam gambar, jadi TIDAK dirender ulang sebagai HTML.
 * Tautan navbar dibuat sebagai zona transparan di atas gambar lewat
 * `SPLIT_NAV_ZONES`.
 *
 * Badik halaman memakai data nyata: buku/artikel dari tab konten
 * "berita-terkini", dokumentasi, dan video TikTok (#ViralForJustice).
 */
export default function NewsAndViewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ytPage?: string;
    ytPer?: string;
  }>;
}) {
  return (
    <>
      <SiteHeader />
      <PageJsonLd data={NEWS_JSON_LD} />
      <PdfHero
        src="/images/news-hero.jpg"
        alt="News & Views Pitaloka — What's Trending, What's True."
        heightPx={1705}
        originY={0}
        zones={SPLIT_NAV_ZONES}
        priority
        mobileCropPt={SPLIT_NAVBAR_CROP_PT}
      />

      {/* Pencarian global — navbar PDF tidak punya kotak search, jadi
          elemennya ditaruh di bawah hero. */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <SearchBar size="md" placeholder="Cari buku di Pitaloka…" />
      </div>

      <DocumentationSection />

      <YoutubeBand searchParams={searchParams} />

      <ViralForJustice />

      <Footer />
    </>
  );
}
