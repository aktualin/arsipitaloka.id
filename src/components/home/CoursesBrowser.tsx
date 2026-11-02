"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import BookCard, { type BookCardData } from "@/components/books/BookCard";
import OwnedBooksProvider from "@/components/books/OwnedBooksProvider";
import ArticleCard, { type ArticleCardData } from "@/components/articles/ArticleCard";
import SocialEmbedPlayer from "@/components/social/SocialEmbedPlayer";
import type { SocialPostData } from "@/components/social/types";

export type CourseTab = { id: string; label: string; slug: string };

/** Data satu item dokumentasi untuk kartu di beranda. */
export type DocItemData = {
  id: string;
  slug: string;
  title: string;
  photoUrl: string | null;
  /** ISO string (eventDate diserialisasi di server). */
  eventDate: string;
};

/**
 * Union bertag: tiap tab bisa berisi buku, video, dokumentasi, atau artikel.
 * Jenis item ditentukan oleh jenis tab di server (lihat FeaturedCourses).
 */
export type TabItem =
  | { kind: "book"; book: BookCardData }
  | { kind: "social"; social: SocialPostData }
  | { kind: "doc"; doc: DocItemData }
  | { kind: "article"; article: ArticleCardData };

type TabKind = "book" | "social" | "doc" | "article";

/** Jenis konten tiap tab diturunkan dari slug-nya. */
function tabKind(slug: string): TabKind {
  if (slug === "youtube" || slug === "tiktok") return "social";
  if (slug === "dokumentasi") return "doc";
  if (slug === "berita-terkini" || slug === "blog" || slug === "umkm")
    return "article";
  return "book";
}

/** Jumlah item per halaman: video lebih sedikit agar grid rapi. */
function pageSize(kind: TabKind): number {
  return kind === "social" ? 3 : 6;
}

/** Tujuan tombol "View More" sesuai jenis tab. */
function viewMoreHref(slug: string, kind: TabKind): string {
  if (kind === "social") return `/buku/${slug}`;
  if (kind === "doc") return "/news-and-views";
  return `/buku/${slug}`;
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Kartu ringkas untuk item dokumentasi. */
function DocCard({ doc }: { doc: DocItemData }) {
  return (
    <Link
      href={`/dokumentasi/${doc.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white transition hover:border-neutral-300"
    >
      <div className="relative flex h-40 items-center justify-center bg-[#3d2b2e]">
        {doc.photoUrl ? (
          <Image
            src={doc.photoUrl}
            alt={doc.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <FileText size={32} className="text-white/70" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-neutral-500">
          {(() => {
            try {
              return DATE_FMT.format(new Date(doc.eventDate));
            } catch {
              return "";
            }
          })()}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-black group-hover:underline">
          {doc.title}
        </h3>
        <span className="mt-auto flex h-9 items-center justify-center rounded-full border border-neutral-300 px-4 text-xs font-medium text-neutral-700">
          Lihat dokumentasi
        </span>
      </div>
    </Link>
  );
}

/**
 * Baris tab konten + daftar item di beranda. Tabnya bisa diklik: isi yang
 * ditampilkan mengikuti tab yang dipilih, dan tiap tab dipaginasi di client.
 * Kelola tabnya di admin → Tab Konten.
 */
export default function CoursesBrowser({
  tabs,
  itemsByTab,
  eyebrow,
  title,
  buttonLabel,
}: {
  tabs: CourseTab[];
  itemsByTab: Record<string, TabItem[]>;
  eyebrow: string;
  title: string;
  buttonLabel: string;
}) {
  const [activeSlug, setActiveSlug] = useState(tabs[0]?.slug ?? "");
  const [page, setPage] = useState(1);

  const active = tabs.find((tab) => tab.slug === activeSlug);
  const kind = tabKind(activeSlug);
  const items = useMemo(
    () => itemsByTab[activeSlug] ?? [],
    [itemsByTab, activeSlug],
  );

  const perPage = pageSize(kind);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const visible = items.slice(start, start + perPage);

  function selectTab(slug: string) {
    setActiveSlug(slug);
    setPage(1); // reset ke halaman 1 saat ganti tab
  }

  const emptyText =
    kind === "social"
      ? "Belum ada video di tab ini"
      : kind === "doc"
        ? "Belum ada dokumentasi"
        : `Belum ada buku di tab ${active?.label ?? "ini"}`;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6 lg:pb-20">
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
        <div>
          <p className="text-xs font-medium text-maroon sm:text-sm">{eyebrow}</p>
          <h2 className="font-heading mt-1 text-xl font-bold text-black sm:text-2xl md:text-3xl">
            {title}
          </h2>
        </div>
        <Link
          href={active ? viewMoreHref(active.slug, kind) : "/buku"}
          className="shrink-0 rounded-full bg-maroon-dark px-4 py-2 text-sm font-medium text-white sm:px-5 sm:py-2"
        >
          {buttonLabel}
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 sm:mb-8 sm:gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.slug)}
            aria-pressed={tab.slug === activeSlug}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              tab.slug === activeSlug
                ? "bg-maroon-dark text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <p className="font-medium text-black">{emptyText}</p>
          <p className="mt-1 text-sm text-neutral-500">
            Tambahkan kontennya di admin, lalu pilih tab ini.
          </p>
        </div>
      ) : (
        <>
          <OwnedBooksProvider>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => {
                if (item.kind === "book") {
                  return <BookCard key={item.book.id} book={item.book} />;
                }
                if (item.kind === "doc") {
                  return <DocCard key={item.doc.id} doc={item.doc} />;
                }
                if (item.kind === "article") {
                  return <ArticleCard key={item.article.id} article={item.article} />;
                }
                const post = item.social;
                return (
                  <div
                    key={post.id}
                    className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white p-3"
                  >
                    <SocialEmbedPlayer
                      platform={post.platform}
                      videoId={post.videoId}
                      embedUrl={post.embedUrl}
                      title={post.title}
                      author={post.author}
                      poster={post.coverUrl}
                      defer
                      showOverlay={false}
                    />
                    <h3 className="mt-2 line-clamp-2 px-1 text-sm font-semibold leading-snug text-black">
                      {post.title}
                    </h3>
                    {post.author && !/^https?:\/\//i.test(post.author) ? (
                      <p className="mt-1 px-1 text-xs text-neutral-500">
                        oleh {post.author}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </OwnedBooksProvider>

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Sebelumnya
              </button>
              <span className="text-sm text-neutral-600">
                Halaman {safePage} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya <ChevronRight size={16} />
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
