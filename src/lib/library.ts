import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../prisma/generated/prisma/client";

/**
 * Status order yang memberi hak akses ke file e-book.
 *
 * PAID/SHIPPED/COMPLETED = sudah dibayar (SHIPPED berarti sudah dikirim,
 * jadi haknya tetap berlaku). PENDING/CANCELLED belum memberi akses.
 */
export const ACCESS_STATUSES = ["PAID", "SHIPPED", "COMPLETED"] as const;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
};

/**
 * Guard area pembeli: wajib login, tapi role apa pun boleh masuk
 * (admin juga punya akun, jadi bisa memakai pustakanya sendiri).
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login?callbackUrl=/akun");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) redirect("/login?callbackUrl=/akun");

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Semua metadata buku yang perlu ditampilkan di area pembeli. */
const BOOK_SELECT = {
  id: true,
  title: true,
  slug: true,
  author: true,
  description: true,
  translator: true,
  editor: true,
  illustrator: true,
  publisher: true,
  publishedYear: true,
  edition: true,
  isbn: true,
  language: true,
  pages: true,
  wordCount: true,
  rating: true,
  priceUsd: true,
  isFree: true,
  isNew: true,
  archived: true,
  coverUrl: true,
  fileUrl: true,
  fileFormat: true,
  fileSize: true,
  isDownloadable: true,
  copyrightHolder: true,
  category: { select: { id: true, name: true, icon: true } },
} as const;

export type LibraryBook = Prisma.BookGetPayload<{
  select: typeof BOOK_SELECT;
}>;

/** Pembelian (satu order) untuk satu buku. */
export type LibraryPurchase = {
  orderId: string;
  orderNumber: string;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  priceUsd: number;
  qty: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
};

/** Satu entri pustaka: satu buku + semua pembeliannya. */
export type LibraryEntry = {
  book: LibraryBook;
  /** "purchase" = dibeli, "free" = buku gratis. */
  source: "purchase" | "free";
  purchases: LibraryPurchase[];
  /** Order terakhir (paling baru) — dipakai untuk badge status. */
  latestStatus: string | null;
  /** Tanggal lancana pertama (tanggal order pertama). */
  acquiredAt: Date | null;
  /** Total yang dibayar (USD) untuk buku ini. */
  paidUsd: number;
  /** User punya hak akses baca/unduh buku ini? */
  canAccess: boolean;
  /** File e-book tersedia? */
  hasFile: boolean;
  /** Boleh diunduh? (hanya kalau punya akses + file + diizinkan) */
  canDownload: boolean;
};

function orderNumber(orderId: string): string {
  return `#${orderId.slice(-8).toUpperCase()}`;
}

/**
 * Pustaka lengkap milik user: SEMUA buku yang relating dengan order-nya
 * (dibeli, gratis, menunggu pembayaran, sampai dibatalkan) plus buku gratis
 * yang tersedia umum. Tidak ada item yang sengaja disembunyikan — statusnya
 * ditandai di kartu.
 */
export async function getLibrary(userId: string): Promise<LibraryEntry[]> {
  const [items, freeBooks] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId } },
      include: {
        book: { select: BOOK_SELECT },
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            paidAt: true,
            paymentMethod: true,
            paymentProvider: true,
          },
        },
      },
      orderBy: { order: { createdAt: "desc" } },
    }),
    prisma.book.findMany({
      where: {
        isFree: true,
        archived: false,
        orderItems: { none: { order: { userId } } },
      },
      select: BOOK_SELECT,
      orderBy: { title: "asc" },
    }),
  ]);

  // Kelompokkan per buku: satu kartu per buku, semua pembeliannya ikut.
  const byBook = new Map<string, LibraryEntry>();

  for (const item of items) {
    const purchase: LibraryPurchase = {
      orderId: item.order.id,
      orderNumber: orderNumber(item.order.id),
      status: item.order.status,
      createdAt: item.order.createdAt,
      paidAt: item.order.paidAt,
      priceUsd: Number(item.priceUsd),
      qty: item.qty,
      paymentMethod: item.order.paymentMethod,
      paymentProvider: item.order.paymentProvider,
    };

    const existing = byBook.get(item.book.id);
    if (existing) {
      existing.purchases.push(purchase);
      continue;
    }

    byBook.set(item.book.id, {
      book: item.book,
      // Buku gratis tetap dihitung "gratis" walau ikut masuk order.
      source: item.book.isFree ? "free" : "purchase",
      purchases: [purchase],
      latestStatus: item.order.status,
      acquiredAt: item.order.createdAt,
      paidUsd: 0,
      canAccess: false,
      hasFile: Boolean(item.book.fileUrl),
      canDownload: false,
    });
  }

  for (const entry of byBook.values()) {
    // Order terbaru (items sudah diurutkan terbaru → index 0).
    entry.purchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    entry.latestStatus = entry.purchases[0]?.status ?? null;
    entry.acquiredAt = entry.purchases[entry.purchases.length - 1]?.createdAt ?? null;
    entry.paidUsd = entry.purchases.reduce(
      (sum, purchase) =>
        sum +
        (ACCESS_STATUSES.includes(purchase.status as (typeof ACCESS_STATUSES)[number])
          ? purchase.priceUsd * purchase.qty
          : 0),
      0,
    );
    entry.canAccess = entry.purchases.some((purchase) =>
      ACCESS_STATUSES.includes(purchase.status as (typeof ACCESS_STATUSES)[number]),
    );
    entry.canDownload =
      entry.canAccess &&
      entry.hasFile &&
      (entry.book.isDownloadable || entry.book.isFree);
  }

  // Buku gratis yang belum pernah dibeli user.
  for (const book of freeBooks) {
    if (byBook.has(book.id)) continue;
    byBook.set(book.id, {
      book,
      source: "free",
      purchases: [],
      latestStatus: null,
      acquiredAt: null,
      paidUsd: 0,
      // Belum diklaim → belum punya akses. Klaim dilakukan lewat
      // POST /api/checkout (order PAID), baru file boleh dibuka.
      canAccess: false,
      hasFile: Boolean(book.fileUrl),
      canDownload: false,
    });
  }

  // Urutan: buku yang baru dibeli di atas, buku gratis di bawah.
  return [...byBook.values()].sort((a, b) => {
    const aTime = a.acquiredAt?.getTime() ?? 0;
    const bTime = b.acquiredAt?.getTime() ?? 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.book.title.localeCompare(b.book.title, "id");
  });
}

/** Ringkasan pustaka untuk kartu statistik di atas daftar. */
export function summarizeLibrary(entries: LibraryEntry[]) {
  const total = entries.length;
  const dibeli = entries.filter((e) => e.source === "purchase").length;
  const gratis = entries.filter((e) => e.source === "free").length;
  const menunggu = entries.filter(
    (e) => e.latestStatus === "PENDING" && !e.canAccess,
  ).length;
  const dibatalkan = entries.filter((e) => e.latestStatus === "CANCELLED").length;
  const halaman = entries.reduce((sum, e) => sum + (e.book.pages ?? 0), 0);
  const totalBayar = entries.reduce((sum, e) => sum + e.paidUsd, 0);

  return { total, dibeli, gratis, menunggu, dibatalkan, halaman, totalBayar };
}

/** Item order yang sudah dibayar — sumber "Pustaka Saya" (versi ringkas). */
export async function getPurchasedItems(userId: string) {
  return prisma.orderItem.findMany({
    where: {
      order: { userId, status: { in: [...ACCESS_STATUSES] } },
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          slug: true,
          coverUrl: true,
          fileUrl: true,
          fileFormat: true,
          fileSize: true,
          pages: true,
          isDownloadable: true,
          isFree: true,
          archived: true,
        },
      },
      order: {
        select: { id: true, status: true, createdAt: true, paidAt: true },
      },
    },
    orderBy: { order: { createdAt: "desc" } },
  });
}

/**
 * Apakah user sudah membeli (lunas) buku ini?
 *
 * Dasarnya hanya order berstatus PAID/SHIPPED/COMPLETED. Buku gratis pun
 * harus diklaim lebih dulu (POST /api/checkout → order PAID) supaya klaimnya
 * tercatat sebagai transaksi.
 */
export async function hasPurchasedBook(
  userId: string,
  bookId: string,
): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: {
      bookId,
      order: { userId, status: { in: [...ACCESS_STATUSES] } },
    },
    select: { id: true },
  });
  return item !== null;
}

/**
 * Id buku yang sudah dimiliki user (order lunas).
 *
 * Dipakai halaman katalog supaya kartu buku yang sudah dibeli tidak
 * menampilkan tombol "Beli" lagi. `bookIds` opsional — kalau diisi, hanya
 * buku-buku itu yang dicek.
 */
export async function getOwnedBookIds(
  userId: string,
  bookIds?: string[],
): Promise<string[]> {
  const rows = await prisma.orderItem.findMany({
    where: {
      bookId: bookIds ? { in: bookIds } : undefined,
      order: { userId, status: { in: [...ACCESS_STATUSES] } },
    },
    select: { bookId: true },
    distinct: ["bookId"],
  });
  return rows.map((row) => row.bookId);
}

/**
 * Apakah user berhak membuka file buku ini?
 *
 * HAK AKSAS HANYA berasal dari pembelian yang sudah lunas (PAID/SHIPPED/
 * COMPLETED). Buku yang belum dibeli — termasuk buku gratis yang belum
 * diklaim — tidak boleh bisa di-preview atau diunduh lewat API, apa pun
 * status loginnya. Buku gratis memperoleh akses lewat klaim
 * (POST /api/checkout → order PAID) seperti buku berbayar.
 *
 * Buku yang sudah dibeli tetap bisa diakses walau kini diarsipkan.
 */
export async function canAccessBook(
  userId: string,
  bookId: string,
): Promise<boolean> {
  return hasPurchasedBook(userId, bookId);
}

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Terjemahkan `Book.fileUrl` menjadi sumber file yang bisa dikirim.
 * - URL absolut (http/https) → arahkan ke sana.
 * - `/files/...` → file privat di `storage/private` (hasil upload admin).
 * - `/...` lain → file di folder `public`.
 */
export function resolveBookFile(
  fileUrl: string,
): { external: string } | { path: string; contentType: string } | null {
  if (!fileUrl) return null;

  if (/^https?:\/\//i.test(fileUrl)) {
    return { external: fileUrl };
  }

  const ext = fileUrl.slice(fileUrl.lastIndexOf(".")).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  if (fileUrl.startsWith("/files/")) {
    const rel = fileUrl.slice("/files/".length);
    return {
      path: `${process.cwd()}/storage/private/${rel}`,
      contentType,
    };
  }

  const rel = fileUrl.replace(/^\/+/, "");
  return { path: `${process.cwd()}/public/${rel}`, contentType };
}
