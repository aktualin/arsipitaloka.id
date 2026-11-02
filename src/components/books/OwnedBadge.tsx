"use client";

import { useOwnedBooks } from "@/components/books/OwnedBooksProvider";

/**
 * Badge "Dimiliki" di sampul kartu buku.
 *
 * Muncul hanya kalau user sudah membeli buku tersebut (dicek lewat
 * `/api/library/owned`). Sampai data-nya datang, badge disembunyikan
 * supaya tidak berkedip.
 */
export default function OwnedBadge({ bookId }: { bookId: string }) {
  const { owned, ready } = useOwnedBooks();

  if (!ready || !owned.has(bookId)) return null;

  return (
    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-maroon">
      Dimiliki
    </span>
  );
}
