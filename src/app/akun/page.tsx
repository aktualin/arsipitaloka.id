import { Suspense } from "react";
import { connection } from "next/server";
import Image from "next/image";
import { Download, BookOpen, Clock, Ban } from "lucide-react";
import { requireUser, getLibrary, summarizeLibrary } from "@/lib/library";
import FreeDownloadButton from "@/components/books/FreeDownloadButton";
import type { LibraryEntry } from "@/lib/library";
import Pagination from "@/components/Pagination";
import { clampPage, parsePage, parsePerPage } from "@/lib/pagination";
import { sanitizeRichText, RICH_TEXT_CLASS } from "@/lib/sanitize-html";
import PageLoader from "@/components/PageLoader";

export const metadata = {
  title: "Pustaka Saya — Arsip Pitaloka",
};

const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "dibeli", label: "Dibeli" },
  { key: "gratis", label: "Gratis" },
  { key: "menunggu", label: "Menunggu Pembayaran" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-neutral-200 text-neutral-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function rupiah(value: unknown): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export default function AccountLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; per?: string; filter?: string; q?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <AccountLibraryPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountLibraryPageContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; per?: string; filter?: string; q?: string }>;
}) {
  await connection();

  const user = await requireUser();
  const entries = await getLibrary(user.id);
  const summary = summarizeLibrary(entries);

  const sp = await searchParams;
  const perPage = parsePerPage(sp.per);
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "semua";
  const q = sp.q?.trim() ?? "";

  const filtered = entries.filter((entry) => {
    if (filter === "dibeli" && entry.source !== "purchase") return false;
    if (filter === "gratis" && entry.source !== "free") return false;
    if (
      filter === "menunggu" &&
      !(entry.latestStatus === "PENDING" && !entry.canAccess)
    ) {
      return false;
    }
    if (q) {
      const haystack = `${entry.book.title} ${entry.book.author}`.toLowerCase();
      if (!haystack.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const total = filtered.length;
  const page = clampPage(parsePage(sp.page), total, perPage);
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-5 px-2 sm:px-0">
      <header>
        <h1 className="font-heading text-xl font-bold text-black sm:text-2xl">
          Pustaka Saya
        </h1>
        <p className="text-sm text-neutral-500">
          Semua buku yang Anda miliki — yang sudah dibeli, buku gratis, dan yang
          masih menunggu pembayaran. Tidak ada yang disembunyikan.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Stat label="Total koleksi" value={String(summary.total)} />
        <Stat label="Dibeli" value={String(summary.dibeli)} />
        <Stat label="Gratis" value={String(summary.gratis)} />
        <Stat
          label="Menunggu bayar"
          value={String(summary.menunggu)}
          tone={summary.menunggu > 0 ? "amber" : undefined}
        />
        <Stat
          label="Dibatalkan"
          value={String(summary.dibatalkan)}
          tone={summary.dibatalkan > 0 ? "red" : undefined}
        />
        <Stat label="Total halaman" value={summary.halaman.toLocaleString("id-ID")} />
        <Stat
          label="Total dibayar"
          value={rupiah(summary.totalBayar)}
        />
      </section>

      <nav className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <a
            key={item.key}
            href={`/akun?filter=${item.key}${
              q ? `&q=${encodeURIComponent(q)}` : ""
            }`}
            className={`flex min-h-9 items-center rounded-full px-3 py-1.5 text-xs font-medium active:scale-95 sm:min-h-10 sm:px-4 sm:py-1.5 sm:text-sm ${
              filter === item.key
                ? "bg-maroon-dark text-white"
                : "bg-white text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* Pencarian judul/penulis — filter dihitung di server lewat `?q=` */}
      <form
        method="get"
        action="/akun"
        className="flex flex-wrap items-center gap-3"
      >
        {filter !== "semua" ? (
          <input type="hidden" name="filter" value={filter} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Cari judul atau penulis buku…"
          aria-label="Cari buku di Pustaka Saya"
          className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-maroon sm:min-w-64"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-maroon-dark px-5 py-2 text-sm font-medium text-white"
        >
          Cari
        </button>
        {q ? (
          <a href="/akun" className="text-sm text-neutral-500 underline">
            Reset
          </a>
        ) : null}
      </form>

      {total === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center sm:p-10">
          <p className="font-medium text-black">
            {entries.length === 0
              ? "Belum ada buku di pustaka Anda"
              : q
                ? "Tidak ada buku yang cocok dengan pencarian"
                : "Tidak ada buku pada filter ini"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {entries.length === 0
              ? "Buku yang Anda beli akan muncul di sini beserta tombol baca dan unduh."
              : q
                ? "Coba kata kunci lain, atau reset pencarian."
                : "Coba pilih filter lain, misalnya Semua."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry) => (
            <LibraryCard key={entry.book.id} entry={entry} />
          ))}
        </div>
      )}

      <Pagination
        basePath="/akun"
        page={page}
        perPage={perPage}
        total={total}
        label="buku"
        params={{
          ...(filter !== "semua" ? { filter } : {}),
          ...(q ? { q } : {}),
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "red";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "red"
        ? "text-red-700"
        : "text-black";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`font-heading mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function LibraryCard({ entry }: { entry: LibraryEntry }) {
  const { book } = entry;
  const menunggu = entry.latestStatus === "PENDING" && !entry.canAccess;
  const dibatalkan = entry.latestStatus === "CANCELLED";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="relative flex h-40 items-end bg-[#3d2b2e] p-3">
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
          {menunggu ? (
            <span className="rounded-full bg-amber-500/80 px-2.5 py-1 text-[11px] font-medium text-white">
              MENUNGGU BAYAR
            </span>
          ) : null}
          {dibatalkan ? (
            <span className="rounded-full bg-red-500/80 px-2.5 py-1 text-[11px] font-medium text-white">
              DIBATALKAN
            </span>
          ) : null}
          {book.archived ? (
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white">
              Diarsipkan
            </span>
          ) : null}
          {book.isNew ? (
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
              BARU
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-semibold text-black">{book.title}</h2>
        <p className="mt-1 text-xs text-neutral-500">by {book.author}</p>

        {book.category ? (
          <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-maroon/10 px-2.5 py-0.5 text-[11px] font-medium text-maroon">
            {book.category.name}
          </p>
        ) : null}

        {book.description ? (
          <div
            className={`mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-600 ${RICH_TEXT_CLASS}`}
            dangerouslySetInnerHTML={{
              __html: sanitizeRichText(book.description),
            }}
          />
        ) : null}

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-neutral-600">
          <div>
            <dt className="text-neutral-400">Bahasa</dt>
            <dd>{book.language}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Halaman</dt>
            <dd>{book.pages}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Kata</dt>
            <dd>{book.wordCount ? book.wordCount.toLocaleString("id-ID") : "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Format</dt>
            <dd>{book.fileFormat ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Ukuran</dt>
            <dd>{formatBytes(book.fileSize) || "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Rating</dt>
            <dd>{String(book.rating)}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Penerbit</dt>
            <dd>{book.publisher ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Tahun</dt>
            <dd>{book.publishedYear ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">ISBN</dt>
            <dd>{book.isbn ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Edisi</dt>
            <dd>{book.edition ?? "-"}</dd>
          </div>
          {book.translator ? (
            <div>
              <dt className="text-neutral-400">Penerjemah</dt>
              <dd>{book.translator}</dd>
            </div>
          ) : null}
          {book.editor ? (
            <div>
              <dt className="text-neutral-400">Editor</dt>
              <dd>{book.editor}</dd>
            </div>
          ) : null}
          {book.illustrator ? (
            <div>
              <dt className="text-neutral-400">Ilustrator</dt>
              <dd>{book.illustrator}</dd>
            </div>
          ) : null}
          {book.copyrightHolder ? (
            <div>
              <dt className="text-neutral-400">Hak cipta</dt>
              <dd>{book.copyrightHolder}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-3 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
          {entry.source === "free" ? (
            <p>
              Buku gratis — klik Download untuk mengklaimnya (tanpa pembayaran),
              lalu file-nya bisa langsung dibuka.
            </p>
          ) : (
            <>
              <p>
                Diperoleh {formatDate(entry.acquiredAt)}
                {entry.paidUsd > 0
                  ? ` · total ${rupiah(entry.paidUsd)}`
                  : ""}
              </p>
              {entry.purchases.map((purchase) => (
                <p
                  key={purchase.orderId}
                  className="mt-1 flex flex-wrap items-center gap-2"
                >
                  <span className="font-medium text-neutral-700">
                    {purchase.orderNumber}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_STYLE[purchase.status] ??
                      "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {STATUS_LABEL[purchase.status] ?? purchase.status}
                  </span>
                  <span>{formatDate(purchase.paidAt ?? purchase.createdAt)}</span>
                  <span>×{purchase.qty}</span>
                  <span>{rupiah(purchase.priceUsd * purchase.qty)}</span>
                </p>
              ))}
            </>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-stretch gap-2 pt-4">
          {entry.canAccess && entry.hasFile ? (
            <a
              href={`/api/read/${book.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-maroon-dark px-4 text-xs font-medium text-white"
            >
              <BookOpen size={14} className="shrink-0" /> Baca
            </a>
          ) : null}

          {entry.canDownload ? (
            <a
              href={`/api/download/${book.id}`}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-300 px-4 text-xs font-medium text-neutral-700"
            >
              <Download size={14} className="shrink-0" /> Unduh
              {book.fileSize ? (
                <span className="truncate text-neutral-400">
                  {formatBytes(book.fileSize)}
                </span>
              ) : null}
            </a>
          ) : null}

          {!entry.canAccess && entry.source === "free" ? (
            /* Buku gratis yang belum diklaim → klaim dulu (order PAID),
               baru file boleh dibuka. */
            <FreeDownloadButton
              bookId={book.id}
              label="Download"
              wrapperClassName="min-w-0 flex-1"
              className="w-full"
            />
          ) : null}

          {!entry.canAccess && entry.source === "purchase" && !dibatalkan ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-amber-700">
              <Clock size={14} /> Menunggu pembayaran — akses belum aktif
            </p>
          ) : null}

          {dibatalkan ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-red-700">
              <Ban size={14} /> Order dibatalkan — akses tidak aktif
            </p>
          ) : null}

          {entry.canAccess && !entry.hasFile ? (
            <p className="text-xs text-neutral-500">File e-book belum tersedia.</p>
          ) : null}

          {entry.canAccess && entry.hasFile && !entry.canDownload ? (
            <p className="text-xs text-neutral-500">
              Buku ini belum bisa diunduh.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
