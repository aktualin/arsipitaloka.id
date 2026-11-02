"use client";

import Link from "next/link";
import { BookOpen, Library } from "lucide-react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import BuyButton from "@/components/books/BuyButton";
import FreeDownloadButton from "@/components/books/FreeDownloadButton";
import { useOwnedBooks } from "@/components/books/OwnedBooksProvider";

/**
 * Baris aksi kartu buku — menyesuaikan dengan status kepemilikan.
 *
 * Buku yang SUDAH dibeli tidak menampilkan tombol Beli/Keranjang lagi:
 * yang muncul adalah "Baca" (buka file) + "Pustaka" (menuju daftar
 * milik user). Tombol bought tetap dilindungi di server —
 * `POST /api/checkout` membalas `alreadyOwned` kalau item sudah dimiliki.
 *
 * `variant`:
 * - "market" → katalog (kartu sempit): tombol keranjang hanya ikon.
 * - "card"   → beranda (kartu lebar): tombol keranjang berlabel penuh.
 */
export default function OwnedBookActions({
  bookId,
  isFree,
  hasFile = false,
  variant = "market",
}: {
  bookId: string;
  isFree: boolean;
  /** File e-book tersedia? (kalau tidak, tidak ada tombol "Baca") */
  hasFile?: boolean;
  variant?: "market" | "card";
}) {
  const { owned } = useOwnedBooks();

  if (owned.has(bookId)) {
    // Fragmen (bukan wrapper sendiri) supaya baris aksi tetap dikendalikan
    // oleh container flex di kartu — tinggi & jaraknya konsisten.
    return (
      <>
        {hasFile ? (
          <a
            href={`/api/read/${bookId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-maroon-dark px-3 text-xs font-medium text-white"
          >
            <BookOpen size={14} className="shrink-0" />
            <span className="truncate">Baca</span>
          </a>
        ) : null}
        <Link
          href="/akun"
          className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-maroon-dark px-3 text-xs font-medium text-maroon-dark"
        >
          <Library size={14} className="shrink-0" />
          <span className="truncate">Pustaka</span>
        </Link>
      </>
    );
  }

  if (isFree) {
    return (
      <FreeDownloadButton
        bookId={bookId}
        compact
        wrapperClassName="min-w-0 flex-1"
        className="w-full"
      />
    );
  }

  if (variant === "market") {
    return (
      <>
        <AddToCartButton
          bookId={bookId}
          iconOnly
          wrapperClassName="shrink-0"
          className="w-9"
        />
        <BuyButton
          bookId={bookId}
          label="Beli"
          compact
          wrapperClassName="min-w-0 flex-1"
          className="w-full"
        />
      </>
    );
  }

  return (
    <>
      <AddToCartButton
        bookId={bookId}
        wrapperClassName="min-w-0 flex-1"
        className="w-full"
      />
      <BuyButton
        bookId={bookId}
        label="Beli"
        compact
        wrapperClassName="min-w-0 flex-1"
        className="w-full"
      />
    </>
  );
}
