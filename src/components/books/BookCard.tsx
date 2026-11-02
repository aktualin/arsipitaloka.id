import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import OwnedBookActions from "@/components/books/OwnedBookActions";
import { formatIdr } from "@/components/books/marketplace/market-utils";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";

export type BookCardData = {
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
  /** Slug tab bukunya — dipakai untuk link detail `/buku/<tab>/<slug>`. */
  tabSlug?: string | null;
};

/**
 * Kartu buku untuk beranda dan katalog (/buku).
 * Dipakai di Server Component maupun Client Component.
 */
export default function BookCard({ book }: { book: BookCardData }) {
  // Detail buku hidup di bawah tab e-book: /buku/e-book/<slug-buku>
  const href = `/buku/${book.tabSlug || BOOK_TAB_SLUG}/${book.slug}`;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white">
      <div className="relative flex h-44 items-end bg-[#3d2b2e] p-3">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : null}
        <div className="relative z-10 flex flex-wrap gap-2">
          {book.isFree ? (
            <span className="rounded-full bg-green-500/80 px-2.5 py-1 text-[11px] font-medium text-white">
              GRATIS
            </span>
          ) : null}
          {book.isNew ? (
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
              NEW
            </span>
          ) : null}
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
            {book.language}
          </span>
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
            {book.pages} Halaman
          </span>
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
            {book.readCount} Di Baca
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-black">
            <Link href={href} className="hover:underline">
              {book.title}
            </Link>
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-black">
            {String(book.rating)}{" "}
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">by {book.author}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
            SU
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="text-sm font-semibold text-black">
            {book.isFree ? "Gratis" : formatIdr(book.priceUsd)}
          </span>
          <Link
            href={href}
            className="flex h-9 items-center rounded-full bg-maroon-dark px-4 py-1.5 text-xs font-medium text-white"
          >
            Lihat Detail
          </Link>
        </div>
        {/* Baris aksi: tinggi tombol seragam (h-9), lebar penuh, dan
            menempel di dasar kartu supaya sejajar antar-kartu. Buku yang
            sudah dimiliki user tidak lagi menampilkan tombol Beli. */}
        <div className="mt-2 flex items-stretch gap-2">
          <OwnedBookActions
            bookId={book.id}
            isFree={book.isFree}
            hasFile={book.hasFile}
            variant="card"
          />
        </div>
      </div>
    </div>
  );
}
