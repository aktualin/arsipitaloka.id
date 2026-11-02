import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatIdr } from "./market-utils";
import OwnedBookActions from "@/components/books/OwnedBookActions";
import OwnedBadge from "@/components/books/OwnedBadge";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";

export type MarketplaceBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  language: string;
  pages: number;
  readCount: number;
  rating: string | number;
  priceUsd: string | number;
  isNew: boolean;
  isFree: boolean;
  /** File e-book tersedia? (kalau ya, kartu yang sudah dimiliki bisa "Baca") */
  hasFile?: boolean;
  /** Slug tab bukunya — link detail `/buku/<tab>/<slug-buku>`. */
  tabSlug?: string | null;
};

/**
 * Kartu produk bergaya marketplace (padat, rasio 1:1).
 *
 * Struktur meniru pola toko marketplace: gambar di atas, baris "nama
 * penerbit" + rating + jumlah dibaca, judul (2 baris), lalu harga.
 * Warna tetap mengikuti tema Pitaloka (maroon), bukan warna marketplace lain.
 */
export default function ProductCard({ book }: { book: MarketplaceBook }) {
  const href = `/buku/${book.tabSlug || BOOK_TAB_SLUG}/${book.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-maroon/40 hover:shadow-sm">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden bg-[#3d2b2e]"
        aria-label={book.title}
      >
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-heading text-lg text-white/45">
            Pitaloka
          </span>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          <OwnedBadge bookId={book.id} />
          {book.isNew ? (
            <span className="rounded bg-maroon-dark px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              New
            </span>
          ) : null}
          {book.isFree ? (
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-maroon">
              Gratis
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <span className="min-w-0 truncate">{book.author}</span>
          <span aria-hidden className="text-neutral-300">
            ·
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-neutral-600">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            {String(book.rating)}
          </span>
          <span aria-hidden className="hidden text-neutral-300 sm:inline">
            ·
          </span>
          <span className="hidden shrink-0 text-neutral-500 sm:inline">
            {book.readCount} dibaca
          </span>
        </p>

        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-neutral-900">
          <Link href={href} className="hover:text-maroon">
            {book.title}
          </Link>
        </h3>

        <div className="mt-auto pt-2">
          <p className="text-base font-bold text-maroon">
            {book.isFree ? "Gratis" : formatIdr(book.priceUsd)}
          </p>
          <p className="text-[11px] text-neutral-400">
            {book.language} · {book.pages} halaman
          </p>
          {/* Baris aksi: tinggi tombol seragam (h-9) dan selalu menempel di
              dasar kartu, sehingga tombol antar-kartu pada satu baris grid
              sejajar. Buku yang sudah dimiliki user tidak lagi menampilkan
              tombol Beli/Keranjang (lihat OwnedBookActions). */}
          <div className="mt-2 flex items-stretch gap-1.5">
            <OwnedBookActions
              bookId={book.id}
              isFree={book.isFree}
              hasFile={book.hasFile}
              variant="market"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
