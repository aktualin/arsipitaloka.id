/**
 * Siapkan akun sementara untuk screenshot area admin + area pembeli.
 * Kredensial acak ditulis ke /tmp/pitaloka-assets/test-users.json
 * (dipakai skrip Playwright), lalu akun bisa dihapus dengan `--cleanup`.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  writeFileSync,
  existsSync,
  unlinkSync,
  readFileSync as readFileSyncImpl,
} from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const OUT = "/tmp/pitaloka-assets/test-users.json";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function cleanup() {
  if (!existsSync(OUT)) {
    console.log("tidak ada file kredensial untuk dibersihkan");
    return;
  }
  const data = JSON.parse(readFileSyncImpl(OUT, "utf8"));
  for (const email of [data.admin.email, data.buyer.email]) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  // Sampul ebook tidak dihapus — file contohnya tetap menempel di seed-book-0
  // supaya fitur unduh/baca di area pembeli tetap bisa dicoba.
  await prisma.book.update({
    where: { id: "seed-book-0" },
    data: {
      fileUrl: "/files/2026/11/contoh-ebook.pdf",
      isDownloadable: true,
      fileSize: 398,
    },
  });
  unlinkSync(OUT);
  console.log("akun sementara dihapus");
}

async function create() {
  const suffix = randomUUID().slice(0, 8);
  const adminEmail = `shot-admin-${suffix}@mail.com`;
  const adminPassword = randomUUID();
  const buyerEmail = `shot-buyer-${suffix}@mail.com`;
  const buyerPassword = randomUUID();

  const admin = await prisma.user.create({
    data: {
      name: "Admin Pitaloka",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  const buyer = await prisma.user.create({
    data: {
      name: "Pembeli Uji",
      email: buyerEmail,
      passwordHash: await hashPassword(buyerPassword),
      role: "CUSTOMER",
      emailVerified: new Date(),
    },
  });

  const book = await prisma.book.findUniqueOrThrow({
    where: { id: "seed-book-0" },
    select: { id: true, title: true },
  });

  await prisma.book.update({
    where: { id: book.id },
    data: {
      fileUrl: "/files/2026/11/contoh-ebook.pdf",
      isDownloadable: true,
      fileSize: 398,
    },
  });

  await prisma.order.create({
    data: {
      userId: buyer.id,
      status: "PAID",
      deliveryMethod: "DOWNLOAD",
      subtotal: 25,
      total: 400000,
      usdToIdrRate: 1,
      paymentProvider: "manual",
      paymentMethod: "QRIS",
      paidAt: new Date(),
      items: {
        create: { bookId: book.id, title: book.title, priceUsd: 25, qty: 1 },
      },
    },
  });

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        admin: { id: admin.id, email: adminEmail, password: adminPassword },
        buyer: { id: buyer.id, email: buyerEmail, password: buyerPassword },
        bookId: book.id,
      },
      null,
      2,
    ),
  );

  console.log(`akun sementara siap → ${OUT}`);
}

main();

async function main() {
  if (process.argv.includes("--cleanup")) await cleanup();
  else await create();
  await prisma.$disconnect();
}
