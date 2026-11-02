import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/site-settings";
import { getSmtpConfig } from "@/lib/smtp";
import ContactForm from "@/components/contact/ContactForm";
import Footer from "@/components/home/Footer";
import PageLoader from "@/components/PageLoader";
import SiteHeader from "@/components/layout/SiteHeader";
import PageJsonLd from "@/components/seo/PageJsonLd";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  SITE_NAME,
} from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Kontak",
  description:
    "Hubungi Arsip Pitaloka untuk pertanyaan, kerja sama, atau masukan. Kirim pesan lewat formulir kontak atau melalui surel resmi kami.",
  path: "/kontak",
  keywords: ["kontak Arsip Pitaloka", "alamat Pitaloka", "surel Pitaloka"],
});

/** Breadcrumb statis (data kontak diambil dari pengaturan situs). */
const KONTAK_BREADCRUMB = breadcrumbJsonLd([
  { name: "Beranda", path: "/" },
  { name: "Kontak", path: "/kontak" },
]);

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageLoader minHeight="60vh" />}>
        <ContactPageContent />
      </Suspense>
      <Footer />
    </>
  );
}

async function ContactPageContent() {
  await connection();

  const [settings, smtp] = await Promise.all([getSettings(), getSmtpConfig()]);

  // Data terstruktur kontak — diambil dari pengaturan situs. Kalau data
  // kontak belum diisi, tetap ada Organization minimal (nama saja).
  const contactOrganization: Record<string, unknown> = {
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
  };
  if (settings["company.email"]) {
    contactOrganization.email = settings["company.email"];
  }
  if (settings["company.phone"]) {
    contactOrganization.telephone = settings["company.phone"];
  }
  if (settings["company.address"]) {
    contactOrganization.address = {
      "@type": "PostalAddress",
      addressLocality: settings["company.address"],
      addressCountry: "ID",
    };
  }

  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Kontak — Arsip Pitaloka",
    url: absoluteUrl("/kontak"),
    mainEntity: contactOrganization,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6 lg:py-16">
      <PageJsonLd data={[contactJsonLd, KONTAK_BREADCRUMB]} />
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-maroon">Kontak</p>
        <h1 className="font-heading mt-1 text-3xl font-bold text-black md:text-4xl">
          Hubungi Kami
        </h1>
        <p className="mt-3 text-neutral-600">
          Punya pertanyaan, kerja sama, atau masukan? Kirim pesan lewat formulir
          di bawah.
        </p>
      </header>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <aside className="space-y-4 text-sm text-neutral-700">
          {settings["company.address"] ? (
            <p className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-maroon" />
              {settings["company.address"]}
            </p>
          ) : null}
          {settings["company.email"] ? (
            <p className="flex items-start gap-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-maroon" />
              <a href={`mailto:${settings["company.email"]}`} className="hover:underline">
                {settings["company.email"]}
              </a>
            </p>
          ) : null}
          {settings["company.phone"] ? (
            <p className="flex items-start gap-3">
              <Phone size={18} className="mt-0.5 shrink-0 text-maroon" />
              {settings["company.phone"]}
            </p>
          ) : null}
        </aside>

        <div>
          {smtp.enabled ? (
            <ContactForm />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <p className="font-medium">Formulir kontak sedang tidak aktif.</p>
              <p className="mt-1">
                Silakan hubungi kami langsung di{" "}
                <a
                  href={`mailto:${settings["company.email"] || "halo@arsippitaloka.com"}`}
                  className="font-medium underline"
                >
                  {settings["company.email"] || "halo@arsippitaloka.com"}
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
