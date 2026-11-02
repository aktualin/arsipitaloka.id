import { prisma } from "@/lib/prisma";
import { canAccessBook } from "@/lib/library";

/**
 * Keranjang belanja (DB) milik user.
 *
 * Bersifat user-specific & dinamis — JANGAN pakai `"use cache"`. E-book memakai
 * qty tetap 1 per judul (`@@unique([userId, bookId])`), jadi keranjang hanyalah
 * daftar bukunya.
 */

/** Data buku ringkas untuk tampilan keranjang. */
const CART_BOOK_SELECT = {
  id: true,
  slug: true,
  title: true,
  author: true,
  coverUrl: true,
  priceUsd: true,
  isFree: true,
  archived: true,
} as const;

export type CartEntry = {
  id: string;
  createdAt: Date;
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
    coverUrl: string | null;
    priceUsd: number;
    isFree: boolean;
    archived: boolean;
  };
};

export type AddToCartResult =
  | { status: "added" | "exists" | "owned" | "free" | "invalid"; count: number };

/** Semua item keranjang user, terbaru di atas. */
export async function getCart(userId: string): Promise<CartEntry[]> {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    select: { id: true, createdAt: true, book: { select: CART_BOOK_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    book: {
      id: item.book.id,
      slug: item.book.slug,
      title: item.book.title,
      author: item.book.author,
      coverUrl: item.book.coverUrl,
      priceUsd: Number(item.book.priceUsd),
      isFree: item.book.isFree,
      archived: item.book.archived,
    },
  }));
}

export async function getCartCount(userId: string): Promise<number> {
  return prisma.cartItem.count({ where: { userId } });
}

/**
 * Tambah buku ke keranjang. Menolak buku yang tidak ada/diarsipkan, buku
 * gratis (diunduh langsung, tidak perlu keranjang), dan buku yang sudah
 * dimiliki user.
 */
export async function addToCart(
  userId: string,
  bookId: string,
): Promise<AddToCartResult> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true, archived: true, isFree: true },
  });

  if (!book || book.archived) {
    return { status: "invalid", count: await getCartCount(userId) };
  }

  // Sudah dibayar → tidak boleh dibeli (lagi). Dicek lebih dulu supaya buku
  // gratis yang SUDAH diklaim dilaporkan sebagai "owned", bukan "free".
  if (await canAccessBook(userId, bookId)) {
    return { status: "owned", count: await getCartCount(userId) };
  }

  // Buku gratis diambil langsung dari halaman buku (tombol Download), bukan
  // lewat keranjang — supaya tidak pernah ikut jadi item Snap bernilai 0.
  if (book.isFree) {
    return { status: "free", count: await getCartCount(userId) };
  }

  const existing = await prisma.cartItem.findUnique({
    where: { userId_bookId: { userId, bookId } },
    select: { id: true },
  });

  if (existing) {
    return { status: "exists", count: await getCartCount(userId) };
  }

  await prisma.cartItem.create({ data: { userId, bookId } });
  return { status: "added", count: await getCartCount(userId) };
}

export async function removeFromCart(
  userId: string,
  bookId: string,
): Promise<number> {
  await prisma.cartItem.deleteMany({ where: { userId, bookId } });
  return getCartCount(userId);
}

/** Hapus beberapa buku dari keranjang (dipakai saat order jadi PAID). */
export async function clearCartBooks(
  userId: string,
  bookIds: string[],
): Promise<void> {
  if (bookIds.length === 0) return;
  await prisma.cartItem.deleteMany({
    where: { userId, bookId: { in: bookIds } },
  });
}
