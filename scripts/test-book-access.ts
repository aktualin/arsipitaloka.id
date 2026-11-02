/**
 * Uji aturan akses e-book & larangan membeli ulang.
 *
 * Yang diuji:
 * 1. Tanpa login → /api/read & /api/download menjawab 401.
 * 2. Login tapi belum membeli → 403 (tidak bisa preview/unduh).
 * 3. Buku gratis: harus diklaim dulu (POST /api/checkout → order PAID),
 *    baru file boleh dibuka; klaim kedua tidak membuat order baru.
 * 4. Buku yang sudah dimiliki → /api/checkout membalas `alreadyOwned`,
 *    /api/cart membalas `owned`, dan tidak bisa ditambahkan ke keranjang.
 * 5. Order PENDING untuk buku yang sama → /api/checkout menjawab 409
 *    (tidak membuat order kedua).
 *
 * Skrip membuat akun & buku sementara, mengujinya, lalu membersihkannya.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/** File contoh yang sudah ada di storage/private (dipakai sebagai isi buku uji). */
const SAMPLE_FILE = "/files/2026/11/contoh-ebook.pdf";

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
    [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
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
  const email = `uji-akses-${suffix}@mail.com`;
  const password = randomUUID();

  const user = await prisma.user.create({
    data: {
      email,
      name: "Uji Akses",
      passwordHash: await hashPassword(password),
      role: "CUSTOMER",
      isActive: true,
    },
    select: { id: true },
  });

  const [paidBook, freeBook] = await Promise.all([
    prisma.book.create({
      data: {
        id: `uji-buku-bayar-${suffix}`,
        slug: `uji-buku-bayar-${suffix}`,
        title: `Uji Buku Bayar ${suffix}`,
        author: "Uji",
        coverUrl: null,
        language: "Indonesia",
        pages: 10,
        wordCount: 100,
        rating: "5",
        priceUsd: "50000",
        isFree: false,
        isNew: false,
        archived: false,
        readCount: 0,
        fileUrl: SAMPLE_FILE,
        fileFormat: "pdf",
        fileSize: 1024,
        isDownloadable: true,
      },
      select: { id: true },
    }),
    prisma.book.create({
      data: {
        id: `uji-buku-gratis-${suffix}`,
        slug: `uji-buku-gratis-${suffix}`,
        title: `Uji Buku Gratis ${suffix}`,
        author: "Uji",
        coverUrl: null,
        language: "Indonesia",
        pages: 10,
        wordCount: 100,
        rating: "5",
        priceUsd: "0",
        isFree: true,
        isNew: false,
        archived: false,
        readCount: 0,
        fileUrl: SAMPLE_FILE,
        fileFormat: "pdf",
        fileSize: 1024,
        isDownloadable: true,
      },
      select: { id: true },
    }),
  ]);

  const anon = makeClient();
  const buyer = makeClient();

  // 1. Tanpa login → 401
  const anonRead = await fetch(`${BASE}/api/read/${paidBook.id}`);
  check("tanpa login → /api/read 401", anonRead.status === 401, String(anonRead.status));
  const anonDownload = await fetch(`${BASE}/api/download/${paidBook.id}`);
  check(
    "tanpa login → /api/download 401",
    anonDownload.status === 401,
    String(anonDownload.status),
  );

  // 2. Login, belum membeli → 403
  const loginStatus = await login(buyer, email, password);
  check("login pembeli", loginStatus === 302, String(loginStatus));

  const readBefore = await fetch(`${BASE}/api/read/${paidBook.id}`, {
    headers: { cookie: buyer.cookie() },
  });
  check(
    "belum membeli → /api/read 403",
    readBefore.status === 403,
    String(readBefore.status),
  );
  const downloadBefore = await fetch(`${BASE}/api/download/${paidBook.id}`, {
    headers: { cookie: buyer.cookie() },
  });
  check(
    "belum membeli → /api/download 403",
    downloadBefore.status === 403,
    String(downloadBefore.status),
  );
  const freeReadBefore = await fetch(`${BASE}/api/read/${freeBook.id}`, {
    headers: { cookie: buyer.cookie() },
  });
  check(
    "buku gratis belum diklaim → /api/read 403",
    freeReadBefore.status === 403,
    String(freeReadBefore.status),
  );

  // 3. Keranjang: buku gratis tidak boleh masuk; buku yang belum dibeli boleh.
  const cartFree = await fetch(`${BASE}/api/cart`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: freeBook.id }),
  });
  const cartFreeData = (await cartFree.json()) as { status?: string; ok?: boolean };
  check(
    "keranjang menolak buku gratis",
    cartFreeData.status === "free" && cartFreeData.ok === false,
    cartFreeData.status,
  );

  const cartPaid = await fetch(`${BASE}/api/cart`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: paidBook.id }),
  });
  const cartPaidData = (await cartPaid.json()) as { status?: string };
  check(
    "keranjang menerima buku yang belum dibeli",
    cartPaidData.status === "added",
    cartPaidData.status,
  );

  // 4. Klaim buku gratis → order PAID → file boleh dibuka.
  const claim = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: freeBook.id }),
  });
  const claimData = (await claim.json()) as { free?: boolean; orderId?: string };
  check(
    "klaim buku gratis → order PAID",
    claim.status === 200 && claimData.free === true && Boolean(claimData.orderId),
    `${claim.status} ${claimData.orderId ?? ""}`,
  );

  const freeReadAfter = await fetch(`${BASE}/api/read/${freeBook.id}`, {
    headers: { cookie: buyer.cookie() },
  });
  check(
    "setelah diklaim → /api/read 200",
    freeReadAfter.status === 200,
    String(freeReadAfter.status),
  );

  // 5. Klaim kedua → tidak ada order baru.
  const claimAgain = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: freeBook.id }),
  });
  const claimAgainData = (await claimAgain.json()) as { alreadyOwned?: boolean };
  check(
    "klaim kedua → alreadyOwned",
    claimAgain.status === 200 && claimAgainData.alreadyOwned === true,
    String(claimAgain.status),
  );
  const freeOrderCount = await prisma.order.count({
    where: { userId: user.id, items: { some: { bookId: freeBook.id } } },
  });
  check(
    "klaim kedua tidak membuat order baru",
    freeOrderCount === 1,
    String(freeOrderCount),
  );

  // 6. Buku gratis yang sudah diklaim → tidak bisa masuk keranjang.
  const cartFreeOwned = await fetch(`${BASE}/api/cart`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: freeBook.id }),
  });
  const cartFreeOwnedData = (await cartFreeOwned.json()) as { status?: string };
  check(
    "keranjang menolak buku yang sudah dimiliki",
    cartFreeOwnedData.status === "owned",
    cartFreeOwnedData.status,
  );

  // 7. Order PENDING untuk buku yang sama → tidak boleh order dobel.
  await prisma.order.create({
    data: {
      userId: user.id,
      status: "PENDING",
      deliveryMethod: "DOWNLOAD",
      subtotal: 50000,
      taxAmount: 0,
      total: 50000,
      usdToIdrRate: 1,
      items: {
        create: {
          bookId: paidBook.id,
          title: "Uji Buku Bayar",
          priceUsd: "50000",
          qty: 1,
        },
      },
    },
  });
  const doubleCheckout = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: paidBook.id }),
  });
  check(
    "order PENDING → checkout 409 (tidak dobel)",
    doubleCheckout.status === 409,
    String(doubleCheckout.status),
  );

  // 8. Buku yang sudah lunas → alreadyOwned, tidak bisa dibeli lagi.
  await prisma.order.updateMany({
    where: { userId: user.id, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date() },
  });
  const ownedCheckout = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: paidBook.id }),
  });
  const ownedData = (await ownedCheckout.json()) as { alreadyOwned?: boolean };
  check(
    "sudah lunas → alreadyOwned",
    ownedCheckout.status === 200 && ownedData.alreadyOwned === true,
    String(ownedCheckout.status),
  );
  const readAfter = await fetch(`${BASE}/api/read/${paidBook.id}`, {
    headers: { cookie: buyer.cookie() },
  });
  check(
    "sudah lunas → /api/read 200",
    readAfter.status === 200,
    String(readAfter.status),
  );
  const ownedCart = await fetch(`${BASE}/api/cart`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: buyer.cookie() },
    body: JSON.stringify({ bookId: paidBook.id }),
  });
  const ownedCartData = (await ownedCart.json()) as { status?: string };
  check(
    "sudah lunas → keranjang menolak",
    ownedCartData.status === "owned",
    ownedCartData.status,
  );

  // 9. Endpoint daftar buku yang dimiliki.
  const ownedList = await fetch(`${BASE}/api/library/owned`, {
    headers: { cookie: buyer.cookie() },
  });
  const ownedListData = (await ownedList.json()) as { bookIds?: string[] };
  check(
    "/api/library/owned memuat buku yang dimiliki",
    (ownedListData.bookIds ?? []).includes(paidBook.id) &&
      (ownedListData.bookIds ?? []).includes(freeBook.id),
    JSON.stringify(ownedListData.bookIds),
  );

  console.log(results.join("\n"));
  const gagal = results.filter((r) => r.startsWith("GAGAL"));
  console.log(
    `\n${results.length - gagal.length}/${results.length} pemeriksaan lolos.`,
  );

  // Bersihkan.
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: user.id } } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.book.deleteMany({
    where: { id: { in: [paidBook.id, freeBook.id] } },
  });
  await prisma.user.delete({ where: { id: user.id } });

  process.exit(gagal.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
