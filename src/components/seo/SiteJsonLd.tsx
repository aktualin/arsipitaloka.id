import { getSettings } from "@/lib/site-settings";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

/**
 * JSON-LD tingkat situs: `Organization` + `WebSite` (dengan SearchAction).
 *
 * Dipasang di root layout supaya ada di setiap halaman — mesin pencari
 * memakai data ini untuk memahami identitas situs & kotak pencariannya.
 */
export default async function SiteJsonLd() {
  const settings = await getSettings();

  return (
    <>
      <JsonLd data={organizationJsonLd(settings)} />
      <JsonLd data={websiteJsonLd(settings)} />
    </>
  );
}
