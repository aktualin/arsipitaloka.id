import { prisma } from "@/lib/prisma";
import SearchBar from "@/components/search/SearchBar";
import {
  DEFAULT_SORT,
  buildBookOrderBy,
  buildBookWhere,
  compactParams,
  languageOptions,
  parseFilters,
  parseSort,
} from "@/lib/book-search";
import { clampPage, parsePage } from "@/lib/pagination";
import FilterSidebar from "@/components/books/marketplace/FilterSidebar";
import ProductGrid from "@/components/books/marketplace/ProductGrid";
import OwnedBooksProvider from "@/components/books/OwnedBooksProvider";
import SortBar from "@/components/books/marketplace/SortBar";
import MarketPagination from "@/components/books/marketplace/MarketPagination";
import {
  getCatalogCategories,
  getCatalogTabs,
} from "@/components/books/marketplace/catalog-facets";
import { getCatalogVideoCounts } from "@/lib/catalog-counts";
import RelatedSocialMedia from "@/components/relations/RelatedSocialMedia";
import { BOOK_TAB_SLUG } from "@/lib/site-tabs";
import {
  buildMarketHref,
  cleanParams,
  parseMarketPer,
} from "@/components/books/marketplace/market-utils";

/**
 * Tampilan katalog buku bergaya marketplace.
 *
 * Dipakai bersama oleh:
 * - `/buku`                     → semua buku
 * - `/buku/<slug-tab>`          → katalog per tab
 * - `/buku/kategori/<slug>`     → katalog per kategori
 *
 * Aturan URL:
 * - Tab & kategori memakai PATH (`/buku/berita-terkini`,
 *   `/buku/kategori/biografi`).
 * - Pencarian, urutan, dan filter lain memakai query string
 *   (`?q=`, `?sort=`, `?bahasa=`, `?hargaMin=`, `?hargaMax=`, `?rating=`,
 *   `?gratis=1`) supaya bisa ikut dibawa saat paginate.
 * - Paginasi memakai `?page=` & `?per=`.
 *
 * CATATAN: komponen ini membaca `searchParams`, jadi TIDAK boleh memakai
 * `"use cache"`. Semua query dijalankan server-side (skip/take + count).
 */
export default async function CatalogView({
  tabSlug = "",
  categorySlug = "",
  page: pageParam,
  per: perParam,
  showHeading = true,
  q,
  sort,
  bahasa,
  hargaMin,
  hargaMax,
  rating,
  gratis,
  searchParams,
}: {
  tabSlug?: string;
  categorySlug?: string;
  page?: string;
  per?: string;
  showHeading?: boolean;
  /** Filter opsional — boleh diisi route atau lewat `searchParams`. */
  q?: string;
  sort?: string;
  bahasa?: string;
  hargaMin?: string;
  hargaMax?: string;
  rating?: string;
  gratis?: string;
  /** Query string mentah (alternatif untuk mengisi filter di atas). */
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rawParams: Record<string, string | string[] | undefined> = {
    q,
    sort,
    bahasa,
    hargaMin,
    hargaMax,
    rating,
    gratis,
    ...(searchParams ?? {}),
  };

  const filters = parseFilters(rawParams);
  const perPage = parseMarketPer(perParam);
  const page = parsePage(pageParam);

  const [tabs, categories, videoCounts] = await Promise.all([
    getCatalogTabs(),
    getCatalogCategories(),
    getCatalogVideoCounts(),
  ]);

  const activeTab = tabs.find((tab) => tab.slug === tabSlug);
  const activeCategory = categories.find((category) => category.slug === categorySlug);

  // Semua buku adalah e-book; kategori menyaring lewat relasi kategori.
  const categoryScope = activeCategory
    ? { category: { slug: activeCategory.slug } }
    : {};

  const scope = { ...categoryScope };

  const where = buildBookWhere(filters, scope);

  const total = await prisma.book.count({ where });
  const currentPage = clampPage(page, total, perPage);

  const books = await prisma.book.findMany({
    where,
    orderBy: buildBookOrderBy(filters.sort),
    skip: (currentPage - 1) * perPage,
    take: perPage,
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      coverUrl: true,
      language: true,
      pages: true,
      readCount: true,
      rating: true,
      priceUsd: true,
      isNew: true,
      isFree: true,
      fileUrl: true,
    },
  });

  // Video yang tertaut ke buku-buku dalam scope katalog ini.
  const relatedPosts = await prisma.socialMedia.findMany({
    where: {
      published: true,
      ...(Object.keys(scope).length ? { book: { is: scope } } : {}),
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: 6,
    select: {
      id: true,
      title: true,
      platform: true,
      videoId: true,
      embedUrl: true,
      coverUrl: true,
      caption: true,
      author: true,
    },
  });

  // Facet: jumlah buku per kategori & bahasa, dalam konteks filter saat ini.
  const [categoryGroups, languageGroups, languageBooks] = await Promise.all([
    prisma.book.groupBy({
      by: ["categoryId"],
      where: { archived: false },
      _count: { _all: true },
    }),
    prisma.book.groupBy({
      by: ["language"],
      where: { archived: false, ...scope },
      _count: { _all: true },
    }),
    prisma.book.findMany({
      where: { archived: false, ...scope },
      select: { language: true },
    }),
  ]);

  const bookTotal = await prisma.book.count({ where: { archived: false } });

  const categoryFacets = categories.map((category) => {
    let count = 0;
    for (const group of categoryGroups) {
      if (group.categoryId === category.id) count += group._count._all;
    }
    // Video ikut dihitung: kategori "Social Media" (semua video) dan
    // "#ViralForJustice" (postingan TikTok).
    count += videoCounts.byCategory.get(category.slug) ?? 0;
    return { slug: category.slug, name: category.name, count };
  });

  const tabFacets = tabs.map((tab) => ({
    slug: tab.slug,
    name: tab.label,
    // Kanal e-book = semua buku; kanal lain (video/artikel) dihitung dari
    // videoCounts / jumlah artikel yang sudah dihitung di tempat lain.
    count:
      (tab.slug === BOOK_TAB_SLUG ? bookTotal : 0) +
      (videoCounts.byTab.get(tab.slug) ?? 0),
  }));

  const languageCount = new Map<string, number>();
  for (const group of languageGroups) {
    languageCount.set(group.language, group._count._all);
  }

  const languageFacets = languageOptions(languageBooks).map((option) => ({
    value: option.value,
    count: languageCount.get(option.value) ?? 0,
  }));

  // Path aktif dipakai sebagai basis link paginasi & filter.
  const basePath = activeCategory
    ? `/buku/kategori/${activeCategory.slug}`
    : activeTab
      ? `/buku/${activeTab.slug}`
      : "/buku";

  // Parameter query yang ikut dibawa di semua link (filter tidak boleh hilang).
  const linkParams = cleanParams(
    compactParams({
      q: filters.q || undefined,
      sort: filters.sort !== DEFAULT_SORT ? filters.sort : undefined,
      bahasa: filters.bahasa || undefined,
      hargaMin:
        filters.hargaMin !== undefined ? String(filters.hargaMin) : undefined,
      hargaMax:
        filters.hargaMax !== undefined ? String(filters.hargaMax) : undefined,
      rating: filters.rating !== undefined ? String(filters.rating) : undefined,
      gratis: filters.gratis ? "1" : undefined,
      per: String(perPage),
    }),
  );

  const heading = activeCategory
    ? activeCategory.name
    : activeTab
      ? activeTab.label
      : "Semua Buku";

  const summary = filters.q
    ? `Menampilkan hasil pencarian untuk “${filters.q}”`
    : "Menampilkan semua buku";

  // "Semua kategori" tetap di tab aktif; "Semua tab" tetap di kategori aktif.
  const allCategoriesPath = activeTab ? `/buku/${activeTab.slug}` : "/buku";
  const allTabsPath = activeCategory
    ? `/buku/kategori/${activeCategory.slug}`
    : "/buku";

  const sidebar = (
    <FilterSidebar
      basePath={basePath}
      params={linkParams}
      categories={categoryFacets}
      tabs={tabFacets}
      languages={languageFacets}
      allCategoriesHref={buildMarketHref(allCategoriesPath, linkParams, {
        page: undefined,
      })}
      allTabsHref={buildMarketHref(allTabsPath, linkParams, {
        page: undefined,
      })}
      activeCategorySlug={activeCategory?.slug ?? ""}
      activeTabSlug={activeTab?.slug ?? ""}
      activeBahasa={filters.bahasa}
      activeHargaMin={filters.hargaMin}
      activeHargaMax={filters.hargaMax}
      activeRating={filters.rating}
      activeGratis={filters.gratis}
    />
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-end sm:justify-between sm:pb-5">
        <div className="min-w-0">
          {showHeading ? (
            <header>
              <p className="text-xs font-medium text-maroon sm:text-sm">Katalog</p>
              <h1 className="font-heading mt-1 text-xl font-bold text-black sm:text-2xl md:text-3xl">
                {heading}
              </h1>
            </header>
          ) : null}
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
            {summary} · {total} buku ditemukan
            {activeTab ? ` pada tab ${activeTab.label}` : ""}
            {activeCategory ? ` · kategori ${activeCategory.name}` : ""}.
          </p>
          <SearchBar
            className="mt-3 max-w-lg sm:max-w-xl"
            basePath="/buku"
            defaultValue={filters.q}
            placeholder="Cari judul, penulis, atau deskripsi buku…"
          />
        </div>

        {/* Sort bar di bawah heading di mobile (tidak overlap). */}
        <div className="shrink-0 self-start sm:self-center">
          <SortBar
            basePath={basePath}
            params={linkParams}
            sort={parseSort(filters.sort)}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-6 sm:gap-8">
        {/* Sidebar filter — sticky di layar besar, jadi drawer di layar kecil. */}
        <aside className="hidden w-[18rem] shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
            {sidebar}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <details className="mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 lg:hidden">
            <summary className="cursor-pointer list-none text-sm font-semibold text-maroon">
              Filter &amp; kategori
            </summary>
            <div className="mt-4">{sidebar}</div>
          </details>

          <OwnedBooksProvider>
            <ProductGrid
              books={books.map((book) => ({
                id: book.id,
                slug: book.slug,
                title: book.title,
                author: book.author,
                coverUrl: book.coverUrl,
                language: book.language,
                pages: book.pages,
                readCount: book.readCount,
                rating: String(book.rating),
                priceUsd: String(book.priceUsd),
                isNew: book.isNew,
                isFree: book.isFree,
                hasFile: Boolean(book.fileUrl),
                tabSlug: BOOK_TAB_SLUG,
              }))}
            />
          </OwnedBooksProvider>

          {relatedPosts.length > 0 ? (
            <RelatedSocialMedia
              posts={relatedPosts}
              heading="Video terkait"
            />
          ) : null}

          <div className="mt-8">
            <MarketPagination
              basePath={basePath}
              page={currentPage}
              perPage={perPage}
              total={total}
              params={linkParams}
              label="buku"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
