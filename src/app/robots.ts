import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * robots.txt — mengizinkan mesin pencari mengindeks halaman publik, tapi
 * menutup area privat (admin, akun pembeli, keranjang) dan halaman auth.
 *
 * `Disallow` di sini deterrent, bukan keamanan: aturan sesungguhnya
 * ada di `src/proxy.ts` (JWT) dan guard server.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/akun",
          "/keranjang",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/cari",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
