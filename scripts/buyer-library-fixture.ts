/**
 * Fixture untuk menguji area pembeli (/akun).
 *
 * Membuat satu pembeli sementara dengan order berstatus Paid, Shipped,
 * Pending, dan Cancelled, plus satu buku gratis yang belum pernah dibeli.
 * Tujuannya: memastikan SEMUA yang dimiliki customer muncul di Pustaka Saya.
 *
 *   npx tsx scripts/buyer-library-fixture.ts create
 *   npx tsx scripts/buyer-library-fixture.ts cleanup
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  writeFileSync,
  existsSync,
  unlinkSync,
  readFileSync,
} from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const OUT = "/tmp/pitaloka-assets/buyer-library.json";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FREE_BOOK_SLUG = "buku-gratis-uji";

async function cleanup() {
  if (!existsSync(OUT)) {
    console.log("tidak ada fixture untuk dibersihkan");
    return;
  }
  const data = JSON.parse(readFileSync(OUT, "utf8"));

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (user) {
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.book.deleteMany({ where: { slug: FREE_BOOK_SLUG } });

  unlinkSync(OUT);
  console.log("fixture pembeli dihapus");
}

async function create() {
  const suffix = randomUUID().slice(0, 8);
  const email = `buyer-uji-${suffix}@mail.com`;
  const password = randomUUID();

  const user = await prisma.user.create({
    data: {
      name: "Pembeli Uji",
      email,
      passwordHash: await hashPassword(password),
      role: "CUSTOMER",
      isActive: true,
    },
  });

  const books = await prisma.book.findMany({
    where: { slug: { startsWith: "bung-karno" } },
    take: 4,
    orderBy: { order: "asc" },
  });
  if (books.length < 4) throw new Error("Butuh minimal 4 buku seed");

  // Buku gratis yang tidak pernah dibeli — harus tetap muncul di pustaka.
  const freeBook = await prisma.book.create({
    data: {
      slug: FREE_BOOK_SLUG,
      title: "Buku Gratis Uji Coba",
      author: "Tim Redaksi",
      description: "Buku gratis untuk menguji tampilan pustaka pembeli.",
      pages: 42,
      wordCount: 1200,
      readCount: 0,
      rating: "4.0",
      priceUsd: "0",
      isFree: true,
      language: "Indonesia",
      fileUrl: "/files/2026/11/contoh-ebook.pdf",
      fileFormat: "PDF",
      fileSize: 398,
      isDownloadable: true,
      order: 99,
    },
  });

  const statuses = ["PAID", "SHIPPED", "PENDING", "CANCELLED"] as const;
  const created: string[] = [];

  // Harga buku sudah dalam Rupiah (IDR) — kurs legacy `usdToIdrRate` selalu 1.
  for (let i = 0; i < statuses.length; i += 1) {
    const status = statuses[i];
    const book = books[i];
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status,
        deliveryMethod: "DOWNLOAD",
        subtotal: "25000",
        taxAmount: "0",
        total: "25000",
        usdToIdrRate: "1",
        paymentProvider: "manual",
        paymentMethod: "QRIS",
        paidAt: status === "PAID" || status === "SHIPPED" ? new Date() : null,
        items: {
          create: {
            bookId: book.id,
            title: book.title,
            priceUsd: "25",
            qty: 1,
          },
        },
      },
    });
    created.push(`${status}:${book.title}`);
  }

  // Satu order PAID berisi dua buku sekaligus.
  await prisma.order.create({
    data: {
      userId: user.id,
      status: "PAID",
      deliveryMethod: "DOWNLOAD",
      subtotal: "50000",
      taxAmount: "0",
      total: "50000",
      usdToIdrRate: "1",
      paymentProvider: "manual",
      paymentMethod: "QRIS",
      paidAt: new Date(),
      items: {
        create: [
          {
            bookId: books[0].id,
            title: books[0].title,
            priceUsd: "25",
            qty: 1,
          },
          {
            bookId: freeBook.id,
            title: freeBook.title,
            priceUsd: "0",
            qty: 1,
          },
        ],
      },
    },
  });

  writeFileSync(
    OUT,
    JSON.stringify({ email, password, created }, null, 2),
    "utf8",
  );
  console.log(`fixture pembeli siap → ${OUT}`);
  console.log(created.join(" | "));
}

async function main() {
  const mode = process.argv[2];
  if (mode === "cleanup") {
    await cleanup();
  } else {
    await create();
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
