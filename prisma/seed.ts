import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { DEFAULT_SETTINGS } from "../src/lib/site-settings-defaults";
import { CATEGORIES, BOOKS } from "./seed-content";
import { ARTICLES } from "./seed-articles";
import { YOUTUBE_VIDEOS, TIKTOK_VIDEOS } from "./seed-media";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Seed Arsip Pitaloka dengan konten NYATA.
 *
 * Isi database:
 * - 6 kategori
 * - 6 buku (5 karya nyata Rieke Diah Pitaloka + 1 panduan gratis)
 * - 17 artikel (12 berita + 3 blog + 2 UMKM)
 * - 12 video YouTube + 14 video TikTok (video publik yang sungguhan ada)
 * - 12/baris TiktokPost untuk section #ViralForJustice
 * - 4 entri dokumentasi
 * - 5 user (1 admin + 4 pembeli) beserta order contoh
 *
 * Semua prosesnya idempotent (upsert dengan id deterministik), jadi seed
 * bisa dijalankan berulang kali tanpa menggandakan data.
 */

/** Password akun seed pembeli. Admin memakai ADMIN_PASSWORD dari .env. */
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "Pitaloka2026!";

/** Dokumentasi untuk gerakan #ViralForJustice. */
const DOCUMENTATIONS = [
  {
    slug: "kampanye-sahkan-ruu-perampasan-aset",
    title: "Kampanye #SahkanRUUPerampasanAset",
    lead:
      "Paripurna DPR RI 27 Agustus 2026 menegaskan momentum penyelesaian RUU Perampasan Aset. 15 Desember 2026 harus jadi titik balik.",
    photoUrl: "/images/seed/berita-6.jpg",
    eventDate: "2026-08-27",
    checklist: [
      "Sahkan RUU Perampasan Aset",
      "RUU yang kuat merampas, kuat melindungi",
      "#ViralForJustice",
    ],
  },
  {
    slug: "kampanye-jaminan-sosial-untuk-rakyat",
    title: "Kampanye #JaminanSosialUntukRakyat",
    lead:
      "UU No. 24 Tahun 2011 tentang BPJS disahkan pada Paripurna DPR RI 2011. Rieke Diah Pitaloka dikenal sebagai inisiator UU BPJS.",
    photoUrl: "/images/seed/berita-12.jpg",
    eventDate: "2025-10-27",
    checklist: [
      "Jaminan sosial untuk rakyat",
      "Tolak kenaikan iuran BPJS",
      "#ViralForJustice",
    ],
  },
  {
    slug: "kampanye-stop-kekerasan-terhadap-perempuan-dan-anak",
    title: "Kampanye #StopKekerasanTerhadapPerempuandanAnak",
    lead:
      "Penegakan hukum harus berpihak pada korban, tanpa memberi celah bagi pelaku untuk lolos.\n",
    photoUrl: "/images/seed/berita-8.jpg",
    eventDate: "2026-06-27",
    checklist: [
      "Stop kekerasan terhadap perempuan dan anak",
      "Sanksi optimal",
      "#ViralForJustice",
    ],
  },
  {
    slug: "kampanye-save-dana-pensiun-pns-tni-polri",
    title: "Kampanye #SaveDanaPensiunPNS",
    lead:
      "Rencana pengalihan pembayaran pensiun PNS, TNI, dan Polri oleh Dirjen Perbendaharaan Kemenkeu menjadi perhatian di Komisi XI DPR RI.",
    photoUrl: "/images/seed/berita-9.jpg",
    eventDate: "2025-02-07",
    checklist: [
      "Save Dana Pensiun PNS",
      "Save Dana Pensiun TNI dan Polri",
      "#ViralForJustice",
    ],
  },
];

/** User seed — 1 admin (dari .env) + 4 pembeli. */
type SeedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
};

const USERS: SeedUser[] = [
  {
    id: "seed-user-rizky",
    name: "Rizky Pratama",
    email: "rizky.pratama@example.com",
    role: "CUSTOMER",
  },
  {
    id: "seed-user-siti",
    name: "Siti Aminah",
    email: "siti.aminah@example.com",
    role: "CUSTOMER",
  },
  {
    id: "seed-user-budi",
    name: "Budi Santoso",
    email: "budi.santoso@example.com",
    role: "CUSTOMER",
  },
  {
    id: "seed-user-dewi",
    name: "Dewi Lestari",
    email: "dewi.lestari@example.com",
    role: "CUSTOMER",
  },
];

/**
 * Order contoh — supaya Pustaka Saya pembeli langsung terisi.
 *
 * `daysAgo` besaran: tanggal order disebar dalam 12 bulan terakhir, supaya
 * grafik dashboard (default: bulanan dalam setahun) punya isi di beberapa
 * periode, bukan semua menumpuk di bulan seed dijalankan. Nilainya relatif
 * terhadap saat seed dijalankan, jadi seed tetap idempotent.
 */
const ORDERS = [
  {
    id: "seed-order-rizky-1",
    userId: "seed-user-rizky",
    status: "PAID" as const,
    deliveryMethod: "DOWNLOAD" as const,
    bookIds: ["seed-book-renungan-kloset", "seed-book-ups"],
    daysAgo: 35,
  },
  {
    id: "seed-order-siti-1",
    userId: "seed-user-siti",
    status: "SHIPPED" as const,
    deliveryMethod: "DOWNLOAD" as const,
    bookIds: ["seed-book-kekerasan-negara"],
    daysAgo: 75,
  },
  {
    id: "seed-order-budi-1",
    userId: "seed-user-budi",
    status: "PENDING" as const,
    deliveryMethod: "DOWNLOAD" as const,
    bookIds: ["seed-book-banalitas-kekerasan"],
    daysAgo: 3,
  },
  {
    id: "seed-order-dewi-1",
    userId: "seed-user-dewi",
    status: "PAID" as const,
    deliveryMethod: "DOWNLOAD" as const,
    bookIds: ["seed-book-sumpah-saripah", "seed-book-panduan-arsip"],
    daysAgo: 163,
  },
];

async function main() {
  /* ---------------------------- Kategori ---------------------------- */
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }
  console.log(`Kategori: ${CATEGORIES.length}`);

  /* ------------------------------ Buku ----------------------------- */
  const ebookCategory = await prisma.category.findUnique({
    where: { slug: "e-book" },
  });
  if (!ebookCategory) throw new Error("Category e-book tidak ditemukan");

  for (const b of BOOKS) {
    const { id, ...rest } = b;
    const current = await prisma.book.findUnique({
      where: { id },
      select: { categoryId: true },
    });
    const categoryId = current?.categoryId ?? ebookCategory.id;
    await prisma.book.upsert({
      where: { id },
      update: { ...rest, categoryId, language: rest.language ?? "Indonesia" },
      create: { id, ...rest, categoryId, language: rest.language ?? "Indonesia" },
    });
  }
  console.log(`Buku: ${BOOKS.length}`);

  /* ---------------------------- Artikel ---------------------------- */
  for (const a of ARTICLES) {
    const { id, ...rest } = a;
    await prisma.article.upsert({
      where: { id },
      update: { ...rest, published: true, publishedAt: new Date(rest.publishedAt) },
      create: {
        id,
        ...rest,
        published: true,
        publishedAt: new Date(rest.publishedAt),
      },
    });
  }
  console.log(`Artikel: ${ARTICLES.length}`);

  /* --------------------- Media sosial (YouTube/TikTok) -------------- */
  const media = [...YOUTUBE_VIDEOS, ...TIKTOK_VIDEOS];
  for (const m of media) {
    const { id, ...rest } = m;
    await prisma.socialMedia.upsert({
      where: { id },
      update: { ...rest, published: true },
      create: { id, ...rest, published: true },
    });
  }
  console.log(`SocialMedia: ${media.length}`);

  /* --------------------------- TiktokPost -------------------------- */
  // Baris TiktokPost dipakai section #ViralForJustice di beranda dan
  // katalog /buku/kategori/viral-for-justice.
  for (const t of TIKTOK_VIDEOS) {
    await prisma.tiktokPost.upsert({
      where: { videoId: t.videoId },
      update: {
        embedUrl: t.embedUrl,
        title: t.title,
        caption: t.caption,
        author: t.author,
        published: true,
        order: t.order,
      },
      create: {
        videoId: t.videoId,
        embedUrl: t.embedUrl,
        title: t.title,
        caption: t.caption,
        author: t.author,
        published: true,
        order: t.order,
      },
    });
  }
  console.log(`TiktokPost: ${TIKTOK_VIDEOS.length}`);

  /* -------------------------- Dokumentasi --------------------------- */
  for (const d of DOCUMENTATIONS) {
    await prisma.documentation.upsert({
      where: { slug: d.slug },
      update: {
        title: d.title,
        lead: d.lead,
        photoUrl: d.photoUrl,
        eventDate: new Date(d.eventDate),
        checklist: d.checklist,
        published: true,
      },
      create: {
        slug: d.slug,
        title: d.title,
        lead: d.lead,
        photoUrl: d.photoUrl,
        eventDate: new Date(d.eventDate),
        checklist: d.checklist,
        published: true,
      },
    });
  }
  console.log(`Documentation: ${DOCUMENTATIONS.length}`);

  /* ------------------------------ User ----------------------------- */
  const customerHash = await hashPassword(SEED_USER_PASSWORD);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
        passwordHash: customerHash,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: true,
        emailVerified: new Date(),
        passwordHash: customerHash,
      },
    });
  }
  console.log(`User pembeli: ${USERS.length} (password: ${SEED_USER_PASSWORD})`);

  /* ----------------------------- Order ----------------------------- */
  // Harga buku sudah disimpan dalam Rupiah (IDR) — tidak ada konversi USD lagi,
  // jadi kurs legacy `usdToIdrRate` selalu 1 (lihat src/lib/pricing.ts).
  const rate = 1;
  for (const o of ORDERS) {
    const items = [];
    let subtotal = 0;
    for (const bookId of o.bookIds) {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, priceUsd: true },
      });
      if (!book) continue;
      subtotal += Number(book.priceUsd);
      items.push({
        bookId: book.id,
        title: book.title,
        priceUsd: book.priceUsd,
        qty: 1,
      });
    }
    const tax = Math.round(subtotal * 0.11);

    // Tanggal order disebar sesuai `daysAgo` supaya grafik dashboard (default:
    // bulanan dalam setahun) terisi di beberapa periode, bukan semua di bulan
    // seed dijalankan. `paidAt` menyusul `createdAt` — order yang belum dibayar
    // (PENDING) tidak punya `paidAt`.
    const createdAt = new Date(Date.now() - o.daysAgo * 86_400_000);
    const paidAt =
      o.status === "PAID" || o.status === "SHIPPED"
        ? new Date(createdAt.getTime() + 86_400_000)
        : null;

    await prisma.order.upsert({
      where: { id: o.id },
      update: {
        status: o.status,
        deliveryMethod: o.deliveryMethod,
        subtotal,
        taxType: "PERCENTAGE",
        taxAmount: tax,
        total: subtotal + tax,
        usdToIdrRate: rate,
        paymentProvider: o.status === "PAID" || o.status === "SHIPPED" ? "manual" : null,
        paymentMethod: o.status === "PAID" || o.status === "SHIPPED" ? "QRIS" : null,
        createdAt,
        paidAt,
      },
      create: {
        id: o.id,
        userId: o.userId,
        status: o.status,
        deliveryMethod: o.deliveryMethod,
        subtotal,
        taxType: "PERCENTAGE",
        taxAmount: tax,
        total: subtotal + tax,
        usdToIdrRate: rate,
        paymentProvider: o.status === "PAID" || o.status === "SHIPPED" ? "manual" : null,
        paymentMethod: o.status === "PAID" || o.status === "SHIPPED" ? "QRIS" : null,
        createdAt,
        paidAt,
        items: { create: items },
      },
    });
  }
  console.log(`Order: ${ORDERS.length}`);

  /* ---------------------------- Pengaturan -------------------------- */
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log(`SiteSetting: ${Object.keys(DEFAULT_SETTINGS).length}`);

  /* ------------------------------ Admin ---------------------------- */
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: "ADMIN",
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
      create: {
        name: "Admin Pitaloka",
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
    console.log(`Admin: ${adminEmail}`);
  } else {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD belum di .env — admin tidak dibuat.");
  }

  console.log("Seed selesai");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
