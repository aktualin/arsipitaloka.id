import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/home/Footer";
import AboutCta from "@/components/about/AboutCta";
import AboutStats from "@/components/about/AboutStats";
import PdfHero from "@/components/layout/PdfHero";
import type { Zone } from "@/components/layout/OverlayLinks";
import { SPLIT_NAVBAR_CROP_PT, SPLIT_NAV_ZONES } from "@/components/layout/split-nav";
import SiteHeader from "@/components/layout/SiteHeader";
import PageJsonLd from "@/components/seo/PageJsonLd";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  SITE_NAME,
} from "@/lib/seo";

const ABOUT_DESCRIPTION =
  "Tentang Arsip Pitaloka — pustaka digital karya Rieke Diah Pitaloka yang menghimpun arsip, dokumentasi, dan e-book dalam satu tempat.";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: ABOUT_DESCRIPTION,
  path: "/about",
  image: "/images/about-hero.jpg",
  keywords: [
    "tentang Pitaloka",
    "Rieke Diah Pitaloka",
    "biografi Rieke Diah Pitaloka",
    "Arsip Pitaloka",
  ],
});

/** Data terstruktur halaman: profil situs + breadcrumb. */
const ABOUT_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About — Arsip Pitaloka",
    description: ABOUT_DESCRIPTION,
    url: absoluteUrl("/about"),
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/images/logo-pitaloka.png"),
    },
  },
  breadcrumbJsonLd([
    { name: "Beranda", path: "/" },
    { name: "About", path: "/about" },
  ]),
];

/**
 * Halaman `/about` dibangun dari potongan `references/layouts/split/MENU
 * ABOUT.pdf` (kanvas 1920 pt).
 *
 * Aset di `public/images/` dirender pada lebar 2400 px untuk kanvas 1920 pt,
 * jadi 1 px = 0,8 pt (1,25 px/pt). Koordinat zona diambil dari
 * `pdftotext -bbox-layout` dan diverifikasi ulang lewat analisis piksel:
 *
 *   - about-hero.jpg    : 2400 × 1732 px  → pt 0 … 1385,6      (originY 0)
 *   - about-profile.jpg : 2400 × 1071 px  → pt 1871 … 2727,8   (originY 1871)
 *   - about-cta.jpg     : 2400 ×  666 px  → pt 2868,5 … 3401,3 (originY 2868,5)
 */
const MENU_ZONES: Zone[] = [
  {
    label: "Kumpulan Buku Original",
    href: "/buku",
    x: 1481,
    y: 236,
    w: 271,
    h: 38,
    hiddenOnMobile: true,
  },
  {
    label: "Biografi Rieke Diah Pitaloka",
    href: "/buku/kategori/biografi",
    x: 1481,
    y: 298,
    w: 303,
    h: 37,
    hiddenOnMobile: true,
  },
  {
    label: "Media For Justice",
    href: "/news-and-views",
    x: 1481,
    y: 354,
    w: 195,
    h: 37,
    hiddenOnMobile: true,
  },
  {
    label: "Bersatu Kita Bisa",
    href: "#cta",
    x: 1481,
    y: 414,
    w: 188,
    h: 37,
    hiddenOnMobile: true,
  },
];

/** Tombol "Know Us More >" — teks putih di atas bar maroon. */
const KNOW_US_MORE_ZONE: Zone = {
  label: "Know Us More",
  href: "/buku/kategori/biografi",
  x: 1017.6,
  y: 2422.1,
  w: 255.9,
  h: 54.8,
  hiddenOnMobile: true,
};

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <PageJsonLd data={ABOUT_JSON_LD} />
      <PdfHero
        src="/images/about-hero.jpg"
        alt="Arsip, Dokumentasi & E-Book by PITALOKA"
        heightPx={1732}
        originY={0}
        zones={[...SPLIT_NAV_ZONES, ...MENU_ZONES]}
        priority
        mobileCropPt={SPLIT_NAVBAR_CROP_PT}
      />
      {/* Menu di dalam gambar hero terlalu kecil untuk jadi target tap di layar
          kecil, jadi tautan yang sama ditampilkan lagi sebagai chip HTML. */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-2 px-4 pt-4 sm:hidden">
        {MENU_ZONES.map((zone) => (
          <Link
            key={zone.label}
            href={zone.href}
            className="flex min-h-10 items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800"
          >
            {zone.label}
          </Link>
        ))}
      </div>
      {/* Band statistik + profil + CTA di bawah mengikuti koordinat PDF
          (band 1464–1628 pt, profil 1871 pt, CTA 2868,5 pt), jadi tidak ada
          elemen HTML tambahan di antara hero dan band. Pencarian global
          tersedia lewat kotak "Cari Buku" di footer. */}
      <AboutStats />
      <PdfHero
        src="/images/about-profile.jpg"
        alt="Profil Rieke Diah “PITALOKA”"
        heightPx={1071}
        originY={1871}
        zones={[KNOW_US_MORE_ZONE]}
      />
      {/* Tombol "Know Us More" di dalam gambar terlalu kecil untuk ditap di
          layar kecil — ditampilkan lagi sebagai tombol HTML. */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:hidden">
        <Link
          href={KNOW_US_MORE_ZONE.href}
          className="flex min-h-11 w-full items-center justify-center rounded-full bg-maroon-dark px-6 py-3 text-sm font-semibold text-white"
        >
          Know Us More
        </Link>
      </div>
      {/* Jarak putih di PDF: profil berakhir di 2727,8 pt, CTA mulai 2868,5 pt. */}
      <div className="h-10 md:h-[4rem]" aria-hidden />
      <AboutCta />
      <Footer />
    </div>
  );
}
