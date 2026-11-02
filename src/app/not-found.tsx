import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/home/Footer";
import NavAuthChip from "@/components/layout/NavAuthChip";
import CartNavButton from "@/components/cart/CartNavButton";
import SiteHeader from "@/components/layout/SiteHeader";
import { buildMetadata } from "@/lib/seo";

/** Halaman 404 tidak pernah diindeks. */
export const metadata = buildMetadata({
  title: "Halaman Tidak Ditemukan",
  description:
    "Halaman yang Anda cari tidak ditemukan. Kembali ke beranda Arsip Pitaloka.",
  noIndex: true,
});

const navZones = [
  { label: "Home", href: "/", left: "36%", width: "4.5%" },
  { label: "Books", href: "/", left: "41.5%", width: "4.5%" },
  { label: "About", href: "/", left: "47%", width: "4.5%" },
  { label: "News & Views", href: "/", left: "52%", width: "8%" },
  { label: "Sign In", href: "/login", left: "79%", width: "5.5%" },
  { label: "Join Us", href: "/register", left: "85%", width: "5.5%" },
];

/**
 * Dimensi gambar 404 (4000 × 2841 px) & band navbar yang dipotong di layar
 * kecil. Navbar tercetak di dalam gambar, jadi di HP teksnya tidak terbaca.
 * Di layar ≥ 640px gambar tetap utuh.
 */
const HERO_WIDTH = 4000;
const HERO_HEIGHT = 2841;
const HERO_CROP = 290;

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <section
        className="pdf-hero relative w-full"
        style={
          {
            "--pdf-hero-w": String(HERO_WIDTH),
            "--pdf-hero-h": String(HERO_HEIGHT),
            "--pdf-hero-h-cropped": String(HERO_HEIGHT - HERO_CROP),
            "--pdf-hero-shift": `${-(HERO_CROP / HERO_HEIGHT) * 100}%`,
          } as React.CSSProperties
        }
      >
        <div className="pdf-hero-inner relative">
          <Image
            src="/images/404-hero.jpg"
            alt="Oops! We can't find the page you're looking for."
            width={HERO_WIDTH}
            height={HERO_HEIGHT}
            priority
            sizes="100vw"
            className="block h-auto w-full"
          />
          <div className="absolute inset-0">
            {navZones.map((z) => (
              <Link
                key={z.label}
                href={z.href}
                aria-label={z.label}
                className="absolute hidden sm:block"
                style={{ top: "4%", left: z.left, width: z.width, height: "4%" }}
              />
            ))}
            <NavAuthChip style={{ top: "4%", right: "9.5%", height: "4%" }} />
            <CartNavButton style={{ top: "4%", left: "92%", width: "2.4%", height: "4%" }} />
            <Link
              href="/"
              aria-label="Go to home page"
              className="absolute block"
              style={{
                left: "35.9%",
                top: "73.6%",
                width: "28.6%",
                height: "7.8%",
              }}
            />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
