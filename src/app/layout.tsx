import type { Metadata } from "next";
import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site-url";
import { DEFAULT_OG_IMAGE, SITE_LOCALE, SITE_NAME } from "@/lib/seo";
import SiteJsonLd from "@/components/seo/SiteJsonLd";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

/**
 * Metadata dasar seluruh situs.
 *
 * `title.template` membuat setiap halaman otomatis menjadi
 * "Judul Halaman — Arsip Pitaloka", jadi halaman TIDAK perlu menulis nama
 * situs sendiri di judulnya.
 *
 * `metadataBase` dipakai Next untuk mengubah path gambar OG jadi URL absolut.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Arsip, Dokumentasi & E-Book`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Arsip Pitaloka — arsip, dokumentasi, dan e-book karya Rieke Diah Pitaloka: buku, berita, blog, UMKM, video, dan dokumentasi dalam satu genggaman.",
  applicationName: SITE_NAME,
  authors: [{ name: "Rieke Diah Pitaloka" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "books",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Arsip, Dokumentasi & E-Book`,
    description:
      "Arsip, dokumentasi, dan e-book karya Rieke Diah Pitaloka dalam satu genggaman.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Arsip, Dokumentasi & E-Book`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Arsip, Dokumentasi & E-Book`,
    description:
      "Arsip, dokumentasi, dan e-book karya Rieke Diah Pitaloka dalam satu genggaman.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
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
  icons: {
    icon: "/favicon.ico",
    apple: "/images/logo-mark.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${baloo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteJsonLd />
        {children}
      </body>
    </html>
  );
}
