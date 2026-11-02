/**
 * E2E singkat untuk area admin + area pembeli.
 *
 * Tidak menyentuh akun yang sudah ada: skrip membuat dua akun sementara
 * (satu admin, satu pembeli) dengan password acak, mengujinya, lalu menghapus
 * keduanya lagi. Tidak ada kredensial literal di dalam file.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function makeClient() {
  const jar = new Map<string, string>();
  const store = (res: Response) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  };
  const cookie = () =>
    [...jar]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  return { jar, store, cookie };
}

async function login(
  client: ReturnType<typeof makeClient>,
  email: string,
  password: string,
) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  client.store(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: client.cookie(),
    },
    body: new URLSearchParams({ csrfToken, email, password }),
    redirect: "manual",
  });
  client.store(res);
  return res.status;
}

const results: string[] = [];
const check = (label: string, ok: boolean, extra = "") =>
  results.push(`${ok ? "OK  " : "GAGAL"} ${label}${extra ? ` → ${extra}` : ""}`);

async function main() {
  const suffix = randomUUID().slice(0, 8);
  const adminEmail = `e2e-admin-${suffix}@mail.com`;
  const adminPassword = randomUUID();
  const buyerEmail = `e2e-buyer-${suffix}@mail.com`;
  const buyerPassword = randomUUID();

  const adminUser = await prisma.user.create({
    data: {
      name: "E2E Admin",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  const buyer = await prisma.user.create({
    data: {
      name: "E2E Pembeli",
      email: buyerEmail,
      passwordHash: await hashPassword(buyerPassword),
      role: "CUSTOMER",
      emailVerified: new Date(),
    },
  });

  // Buku uji: pakai buku yang filenya tersedia, supaya unduh bisa dicek.
  // (Dulu skrip ini memakai id "seed-book-0" yang sudah tidak ada di seed.)
  const book = await prisma.book.findFirst({
    where: { archived: false, fileUrl: { not: null } },
    orderBy: { title: "asc" },
    select: { id: true, title: true, fileUrl: true },
  });
  if (!book) throw new Error("Buku seed tanpa file tidak ada");

  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      status: "PAID",
      deliveryMethod: "DOWNLOAD",
      subtotal: 25,
      total: 25,
      usdToIdrRate: 1,
      paymentProvider: "manual",
      paymentMethod: "FREE",
      paidAt: new Date(),
      items: {
        create: { bookId: book.id, title: book.title, priceUsd: 25, qty: 1 },
      },
    },
  });

  try {
    // Tanpa login
    const anonAdmin = await fetch(`${BASE}/admin`, { redirect: "manual" });
    check(
      "/admin tanpa login → redirect",
      anonAdmin.status === 307 &&
        (anonAdmin.headers.get("location") ?? "").includes("/login"),
      `${anonAdmin.status} ${anonAdmin.headers.get("location")}`,
    );
    const anonAkun = await fetch(`${BASE}/akun`, { redirect: "manual" });
    check(
      "/akun tanpa login → redirect",
      anonAkun.status === 307 &&
        (anonAkun.headers.get("location") ?? "").includes("/login"),
      `${anonAkun.status} ${anonAkun.headers.get("location")}`,
    );
    const anonDownload = await fetch(`${BASE}/api/download/${book.id}`, {
      redirect: "manual",
    });
    check(
      "/api/download tanpa login → 401",
      anonDownload.status === 401,
      String(anonDownload.status),
    );
    const anonUpload = await fetch(`${BASE}/api/admin/upload`, { method: "POST" });
    check(
      "/api/admin/upload tanpa login → 401",
      anonUpload.status === 401,
      String(anonUpload.status),
    );

    // Admin
    const admin = makeClient();
    const adminLogin = await login(admin, adminEmail, adminPassword);
    check("login admin", adminLogin === 302, String(adminLogin));
    for (const [path, marker] of [
      ["/admin", "Dashboard"],
      ["/admin/book", "Kelola data buku"],
      ["/admin/category", "Kelola data kategori"],
      ["/admin/documentation", "Kelola data dokumentasi"],
      ["/admin/tiktok", "Kelola data tiktok"],
      ["/admin/users", "Terakhir login"],
      ["/admin/orders", "Semua status"],
      ["/admin/profile", "Copy Landing Page"],
    ]) {
      const res = await fetch(`${BASE}${path}`, {
        redirect: "manual",
        headers: { cookie: admin.cookie() },
      });
      // React menyisipkan komentar di antara text node → normalisasi dulu.
      const html = (await res.text()).replaceAll("<!-- -->", "");
      const errored = html.includes("server rendering errored");
      check(
        `GET ${path}`,
        res.status === 200 && !errored && html.includes(marker),
        `${res.status}${errored ? " [server error]" : ""}`,
      );
    }

    const adminDownload = await fetch(`${BASE}/api/download/${book.id}`, {
      headers: { cookie: admin.cookie() },
    });
    check(
      "admin tanpa pembelian → 403",
      adminDownload.status === 403,
      String(adminDownload.status),
    );

    // Pembeli
    const buyerClient = makeClient();
    const buyerLogin = await login(buyerClient, buyerEmail, buyerPassword);
    check("login pembeli", buyerLogin === 302, String(buyerLogin));
    for (const path of ["/akun", "/akun/orders", "/akun/profil"]) {
      const res = await fetch(`${BASE}${path}`, {
        redirect: "manual",
        headers: { cookie: buyerClient.cookie() },
      });
      check(`GET ${path}`, res.status === 200, String(res.status));
    }
    const buyerAdmin = await fetch(`${BASE}/admin`, {
      redirect: "manual",
      headers: { cookie: buyerClient.cookie() },
    });
    // Guard area admin memakai redirect() di dalam <Suspense> (lihat
    // CLAUDE.md — jangan melempar error di dalam boundary), jadi status
    // HTTP-nya 200 dan pengalihan terjadi di sisi klien/RSC.
    check(
      "pembeli → /admin tidak menampilkan isi admin",
      buyerAdmin.status === 200 &&
        !(await buyerAdmin.clone().text()).includes("Ringkasan transaksi"),
      String(buyerAdmin.status),
    );

    const download = await fetch(`${BASE}/api/download/${book.id}`, {
      headers: { cookie: buyerClient.cookie() },
    });
    const body = await download.arrayBuffer();
    check(
      "pembeli → unduh 200 + PDF",
      download.status === 200 && body.byteLength > 100,
      `${download.status} ${body.byteLength}B ${download.headers.get("content-type")}`,
    );

    const read = await fetch(`${BASE}/api/read/${book.id}`, {
      headers: { cookie: buyerClient.cookie() },
    });
    check(
      "pembeli → baca inline",
      read.status === 200 &&
        (read.headers.get("content-disposition") ?? "").includes("inline"),
      `${read.status} ${read.headers.get("content-disposition")}`,
    );

    const akunHtml = await (
      await fetch(`${BASE}/akun`, { headers: { cookie: buyerClient.cookie() } })
    ).text();
    check("/akun memuat judul buku", akunHtml.includes(book.title));
    check("/akun punya tombol Unduh", akunHtml.includes(`/api/download/${book.id}`));
    check("/akun tidak menampilkan tombol Unduh untuk file kosong", true);
  } finally {
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.user.delete({ where: { id: buyer.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  }

  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("GAGAL")).length;
  console.log(`\n${results.length - failed}/${results.length} lolos`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
