import Link from "next/link";
import { cacheTag } from "next/cache";
import SearchBar from "@/components/search/SearchBar";
import NewsletterForm from "@/components/home/NewsletterForm";
import { getSettings } from "@/lib/site-settings";
import { getSiteTabs } from "@/lib/site-tabs";

function toList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function Footer() {
  "use cache";
  cacheTag("content");
  const [settings, tabs] = await Promise.all([getSettings(), Promise.resolve(getSiteTabs())]);

  // Tautan "Browse" diarahkan ke tab katalog yang namanya cocok.
  const slugByLabel = new Map(
    tabs.map((tab) => [tab.label.toLowerCase().replace(/[^a-z0-9]/g, ""), tab.slug]),
  );

  const browseLinks = toList(settings["footer.browse.links"]);
  const platformLinks = toList(settings["footer.platform.links"]);

  return (
    <footer className="bg-maroon-dark px-4 pt-12 pb-5 text-white sm:px-6 md:pt-16 md:pb-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 sm:gap-10 md:grid-cols-3">
        <div className="space-y-5 sm:space-y-6">
          <NewsletterForm
            placeholder={settings["footer.subscribe.placeholder"]}
            buttonLabel={settings["footer.subscribe.button"]}
            consentText={settings["footer.subscribe.text"]}
          />

          {/* Pencarian global — submit diarahkan ke /cari?q=… */}
          <div className="w-full max-w-sm">
            <p className="mb-2 text-sm font-semibold text-white/90">
              Cari Buku
            </p>
            <SearchBar
              size="sm"
              placeholder="Cari judul atau penulis…"
              withSuggestions
              inputClassName="text-neutral-900 placeholder:text-neutral-400"
              buttonClassName="bg-maroon hover:bg-maroon-dark"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-white/90 sm:text-sm">
            {settings["footer.browse.title"]}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-white/70 sm:gap-y-3 sm:text-sm">
            {browseLinks.map((l) => {
              const slug = slugByLabel.get(
                l.toLowerCase().replace(/[^a-z0-9]/g, ""),
              );
              return slug ? (
                <Link key={l} href={`/buku/${slug}`} className="flex min-h-9 items-center hover:text-white">
                  {l}
                </Link>
              ) : (
                <span key={l} className="flex min-h-9 items-center">{l}</span>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-white/90 sm:text-sm">
            {settings["footer.platform.title"]}
          </p>
          <div className="mt-3 flex flex-col gap-2 text-xs text-white/70 sm:gap-3 sm:text-sm">
            {platformLinks.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 w-full max-w-6xl border-t border-white/15 pt-5 sm:mt-14 lg:pt-6">
        <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-white/70 sm:text-xs md:flex-row">
          <span>{settings["company.copyright"]}</span>
          <div className="flex gap-6">
            <span className="underline">{settings["footer.legal.privacy"]}</span>
            <span className="underline">{settings["footer.legal.terms"]}</span>
            <span className="underline">{settings["footer.legal.cookies"]}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
