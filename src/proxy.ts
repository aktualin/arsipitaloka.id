import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ENTITIES } from "@/lib/admin/entities";

/**
 * Halaman admin yang punya route sendiri (bukan entitas CRUD generik).
 * `/admin` sendiri tidak termasuk — segment pertama kosong.
 */
const ADMIN_PAGES = new Set([
  "akun",
  "media",
  "newsletter",
  "orders",
  "profile",
  "users",
  "export",
]);

/**
 * Apakah path `/admin/<segmen>` tidak dikenal?
 *
 * Contoh: `/admin/laporan` — route-nya sudah dihapus (laporan kini menyatu di
 * `/admin`). Tanpa cek di sini, path itu akan jatuh ke route generik
 * `/admin/[entity]` dan menghasilkan halaman 404 berstatus 200 (lemparan
 * `notFound()` di dalam `<Suspense>` layout admin tidak bisa jadi status 404).
 * Di proxy, redirect-nya jadi 307 yang benar.
 */
function isUnknownAdminPath(pathname: string): boolean {
  const rest = pathname.slice("/admin".length).replace(/^\/+/, "");
  const first = rest.split("/")[0] ?? "";
  if (!first) return false;
  return !ADMIN_PAGES.has(first) && !ENTITIES[first];
}

/**
 * Gerbang area admin + area pembeli — lapisan pertama, cepat.
 *
 * `/admin` dan `/api/admin`:
 *   1. `proxy.ts` (di sini) → tolak cepat berdasarkan JWT, tanpa query DB.
 *   2. `requireAdmin()` → cek role ke DB lagi sebelum merender data sensitif,
 *      supaya role yang diubah admin langsung berlaku (JWT bisa basi 7 hari).
 *
 * `/akun` (pustaka pembeli): wajib login, role apa pun boleh masuk.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth?.user;

  // Katalog sekarang memakai path: /buku/<tab> dan /buku/kategori/<kategori>.
  // URL lama (?tab= / ?kategori=) diarahkan ke path barunya supaya tautan
  // lama tidak mati.
  if (pathname === "/buku") {
    const tab = req.nextUrl.searchParams.get("tab");
    const kategori = req.nextUrl.searchParams.get("kategori");
    const target = tab
      ? `/buku/${tab}`
      : kategori
        ? `/buku/kategori/${kategori}`
        : null;

    if (target) {
      const url = new URL(target, req.nextUrl);
      for (const key of ["page", "per"]) {
        const value = req.nextUrl.searchParams.get(key);
        if (value) url.searchParams.set(key, value);
      }
      return NextResponse.redirect(url);
    }
  }

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  // Keranjang diperlakukan seperti area pembeli: wajib login, role apa pun.
  const isAccountArea =
    pathname.startsWith("/akun") || pathname.startsWith("/keranjang");

  if (isAdminArea) {
    if (session?.role === "ADMIN") {
      // Path admin yang tidak dikenal → dashboard (307, bukan 404 palsu).
      if (isUnknownAdminPath(pathname)) {
        return NextResponse.redirect(new URL("/admin", req.nextUrl));
      }
      return NextResponse.next();
    }
    // Sudah login tapi bukan admin:
    //  - endpoint API admin → 403 JSON (bukan redirect, supaya fetch tidak
    //    menerima HTML);
    //  - halaman admin → biarkan lewat agar layout merender 404 (notFound).
    if (session?.id) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.next();
    }
    // Anonim → jatuh ke redirect login di bawah.
  } else if (isAccountArea) {
    // Area pembeli: cukup punya sesi, tidak boleh kehilangan akses
    // hanya karena role-nya bukan ADMIN.
    if (session?.id) return NextResponse.next();
  } else {
    return NextResponse.next();
  }

  // Endpoint API dibalas 401 JSON, bukan redirect ke halaman login —
  // supaya fetch() dari client tidak menerima HTML.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL("/login", req.nextUrl);
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/akun/:path*",
    "/keranjang/:path*",
    "/buku",
  ],
};
