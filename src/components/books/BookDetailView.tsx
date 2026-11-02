import Link from "next/link";
import { Star, BookOpen, Download } from "lucide-react";
import { auth } from "@/auth";
import { canAccessBook } from "@/lib/library";
import { getSettings } from "@/lib/site-settings";
import { getMidtransConfig, isMidtransConfigured } from "@/lib/midtrans";
import BuyButton from "@/components/books/BuyButton";
import FreeDownloadButton from "@/components/books/FreeDownloadButton";
import { getBookRelations } from "@/lib/relations";
import RelatedSocialMedia from "@/components/relations/RelatedSocialMedia";
import ShareButtons from "@/components/books/ShareButtons";
import { formatIdr } from "@/components/books/marketplace/market-utils";
import { sanitizeRichText, RICH_TEXT_CLASS } from "@/lib/sanitize-html";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";
import type { Prisma } from "../../../prisma/generated/prisma/client";

export type BookWithRelations = Prisma.BookGetPayload<{
  include: { category: true };
}>;

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Halaman detail satu buku.
 * URL: `/buku/<slug-tab>/<slug-buku>`.
 */
export default async function BookDetailView({
  book,
}: {
  book: BookWithRelations;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const sudahPunya = userId ? await canAccessBook(userId, book.id) : false;
  const settings = await getSettings();
  const midtrans = await getMidtransConfig();
  const midtransAktif = midtrans.enabled && isMidtransConfigured(midtrans);
  const midtransMode = midtrans.mode;
  const { socialMedia } = await getBookRelations(book.id);

  const bookPath = `/buku/${BOOK_TAB_SLUG}/${book.slug}`;

  const fitur: { label: string; value: string }[] = [
    { label: "Bahasa", value: book.language },
    { label: "Halaman", value: String(book.pages) },
    { label: "Jumlah kata", value: book.wordCount ? String(book.wordCount) : "-" },
    { label: "Format file", value: book.fileFormat ?? "-" },
    { label: "Ukuran file", value: formatBytes(book.fileSize) },
  ];
  const info: { label: string; value: string }[] = [
    { label: "Penerbit", value: book.publisher ?? "-" },
    { label: "Tahun terbit", value: book.publishedYear ? String(book.publishedYear) : "-" },
    { label: "Edisi", value: book.edition ?? "-" },
    { label: "ISBN", value: book.isbn ?? "-" },
    { label: "Penerjemah", value: book.translator ?? "-" },
    { label: "Editor", value: book.editor ?? "-" },
    { label: "Ilustrator", value: book.illustrator ?? "-" },
    { label: "Pemegang hak cipta", value: book.copyrightHolder ?? "-" },
    { label: "Kategori", value: book.category?.name ?? "-" },
  ];

  const renderList = (items: { label: string; value: string }[]) => (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pb-4 text-sm">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-neutral-400">{item.label}</dt>
          <dd className="mt-0.5 text-neutral-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
  const sumCls = "cursor-pointer py-3 text-sm font-semibold text-black";

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 md:py-10">

      <div className="mt-6">
        <div>
          <div className="flex items-center gap-2 overflow-x-auto text-xs text-neutral-500 sm:text-sm">
          <Link href="/buku" className="shrink-0 hover:underline">
            Katalog
          </Link>
          {" · "}
          <Link href={`/buku/${BOOK_TAB_SLUG}`} className="shrink-0 truncate hover:underline">
            E-Book
          </Link>
          {book.category ? (
            <>
              {" · "}
              <Link
                href={`/buku/kategori/${book.category.slug}`}
                className="shrink-0 truncate hover:underline"
              >
                {book.category.name}
              </Link>
            </>
          ) : null}
        </div>
          <h1 className="font-heading text-2xl font-bold text-black md:text-3xl">
            {book.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">by {book.author}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-medium text-black">
              {String(book.rating)}{" "}
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
            </span>
            {book.isFree ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Gratis
              </span>
            ) : (
              <span className="font-semibold text-black">
                {formatIdr(book.priceUsd)}{" "}
                <span className="font-normal text-neutral-500">/lifetime</span>
              </span>
            )}
            {book.isNew ? (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                Baru
              </span>
            ) : null}
          </div>

          {book.description ? (
            <div
              className={`mt-5 text-sm leading-relaxed text-neutral-700 ${RICH_TEXT_CLASS}`}
              dangerouslySetInnerHTML={{
                __html: sanitizeRichText(book.description),
              }}
            />
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {sudahPunya && book.fileUrl ? (
              /* Buku sudah dimiliki (dibeli) → tombol Baca + Unduh, bukan
                 "Beli". */
              <>
                <a
                  href={`/api/read/${book.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-maroon-dark px-5 py-2 text-sm font-medium text-white"
                >
                  <BookOpen size={16} /> Baca
                </a>
                {book.isDownloadable || book.isFree ? (
                  <a
                    href={`/api/download/${book.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700"
                  >
                    <Download size={16} /> Unduh
                  </a>
                ) : null}
                <Link
                  href="/akun"
                  className="text-sm font-medium text-maroon hover:underline"
                >
                  Lihat di Pustaka Saya →
                </Link>
              </>
            ) : sudahPunya ? (
              /* Sudah dibeli, tapi file-nya belum tersedia → tetap bukan
                 tombol Beli: buku ini sudah milik user. */
              <div className="w-full space-y-2">
                <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                  Buku ini sudah Anda miliki. File e-book-nya belum tersedia
                  — hubungi kami bila Anda membutuhkannya.
                </p>
                <Link
                  href="/akun"
                  className="text-sm font-medium text-maroon hover:underline"
                >
                  Lihat di Pustaka Saya →
                </Link>
              </div>
            ) : book.isFree ? (
              /* Buku gratis yang belum diklaim → tombol Download:
                 klaim lewat /api/checkout (jadi order PAID) lalu buka file.
                 Bukan "Beli Sekarang". */
              <div className="w-full space-y-2">
                <FreeDownloadButton
                  bookId={book.id}
                  label="Download"
                  wrapperClassName="w-full"
                  className="w-full"
                />
                <p className="text-xs text-neutral-500">
                  Gratis — setelah diklaim buku tersimpan di Pustaka Saya.
                </p>
              </div>
            ) : userId ? (
              midtransAktif ? (
                <div className="w-full space-y-2">
                  <BuyButton
                    bookId={book.id}
                    loginUrl={`/login?callbackUrl=${bookPath}`}
                    label="Beli Sekarang"
                  />
                  <p className="text-xs text-neutral-500">
                    Pembayaran aman lewat Midtrans{" "}
                    {midtransMode === "sandbox" ? "(mode sandbox — uji coba)" : ""}.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-medium">Buku ini belum ada di pustaka Anda.</p>
                  <p className="mt-1 text-xs">
                    Checkout sedang disiapkan. Untuk sekarang hubungi kami di{" "}
                    {settings["company.email"] || "halo@arsippitaloka.com"}.
                  </p>
                </div>
              )
            ) : (
              <div className="flex w-full flex-wrap items-center gap-3">
                <Link
                  href={`/login?callbackUrl=${bookPath}`}
                  className="block w-full rounded-full bg-maroon-dark px-5 py-2 text-center text-sm font-medium text-white"
                >
                  Beli Sekarang
                </Link>
                <span className="text-xs text-neutral-500">
                  Masuk dulu untuk membeli — setelah login Anda diarahkan ke
                  pustaka.
                </span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <ShareButtons url={bookPath} title={book.title} />
          </div>

          <div className="mt-6 border-t border-neutral-200">
            <details className="border-b border-neutral-200" open>
              <summary className={sumCls}>Fitur</summary>
              {renderList(fitur)}
            </details>
            <details className="border-b border-neutral-200">
              <summary className={sumCls}>Informasi Buku</summary>
              {renderList(info)}
            </details>
            <details className="border-b border-neutral-200">
              <summary className={sumCls}>Cara Baca</summary>
              <p className="pb-4 text-sm text-neutral-700">
                Setelah membeli, buku bisa dibaca langsung di browser atau diunduh dalam format PDF.
              </p>
            </details>
            <details className="border-b border-neutral-200">
              <summary className={sumCls}>Pengembalian</summary>
              <p className="pb-4 text-sm text-neutral-700">
                Produk digital tidak dapat dikembalikan setelah dibeli.
              </p>
            </details>
          </div>
        </div>
      </div>
      <RelatedSocialMedia posts={socialMedia} />
    </div>
  );
}
