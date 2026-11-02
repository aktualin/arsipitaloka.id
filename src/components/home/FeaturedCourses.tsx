import { cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/site-settings";
import { getSiteTabs, BOOK_TAB_SLUG } from "@/lib/site-tabs";
import { tiktokPlayerUrl } from "@/lib/tiktok";
import CoursesBrowser, { type TabItem } from "@/components/home/CoursesBrowser";

/** Berapa banyak item per tab yang diambil dari DB (pagination sisanya di client). */
const PER_TAB_LIMIT = 48;

export default async function FeaturedCourses() {
  "use cache";
  cacheTag("content");

  const tabs = getSiteTabs();

  const [books, youtube, tiktoks, articles, docs, settings] = await Promise.all([
    prisma.book.findMany({
      where: { archived: false },
      orderBy: { order: "asc" },
      take: PER_TAB_LIMIT,
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
    }),
    // Tab YouTube → video YouTube (tabel SocialMedia).
    prisma.socialMedia.findMany({
      where: { published: true, platform: "youtube" },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: PER_TAB_LIMIT,
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
    }),
    // Tab TikTok → postingan TikTok yang diunggah admin (tabel TiktokPost).
    prisma.tiktokPost.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: PER_TAB_LIMIT,
      select: {
        id: true,
        videoId: true,
        embedUrl: true,
        title: true,
        caption: true,
        author: true,
      },
    }),
    prisma.article.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: PER_TAB_LIMIT,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverUrl: true,
        type: true,
        publishedAt: true,
      },
    }),
    prisma.documentation.findMany({
      where: { published: true },
      orderBy: { eventDate: "desc" },
      take: PER_TAB_LIMIT,
      select: {
        id: true,
        slug: true,
        title: true,
        photoUrl: true,
        eventDate: true,
      },
    }),
    getSettings(),
  ]);

  const itemsByTab: Record<string, TabItem[]> = {};
  for (const tab of tabs) itemsByTab[tab.slug] = [];

  for (const tab of tabs) {
    const list = itemsByTab[tab.slug];

    if (tab.slug === "youtube") {
      for (const s of youtube) {
        list.push({
          kind: "social",
          social: {
            id: s.id,
            title: s.title,
            platform: s.platform,
            videoId: s.videoId,
            embedUrl: s.embedUrl,
            coverUrl: s.coverUrl,
            caption: s.caption,
            author: s.author,
          },
        });
      }
    } else if (tab.slug === "tiktok") {
      for (const t of tiktoks) {
        list.push({
          kind: "social",
          social: {
            id: t.id,
            title: t.title,
            platform: "tiktok",
            videoId: t.videoId,
            embedUrl: t.embedUrl ?? tiktokPlayerUrl(t.videoId),
            coverUrl: null,
            caption: t.caption,
            author: t.author,
          },
        });
      }
    } else if (tab.slug === "dokumentasi") {
      for (const d of docs) {
        list.push({
          kind: "doc",
          doc: {
            id: d.id,
            slug: d.slug,
            title: d.title,
            photoUrl: d.photoUrl,
            eventDate: d.eventDate.toISOString(),
          },
        });
      }
    } else if (tab.kind === "articles") {
      for (const a of articles) {
        if (a.type !== tab.articleType) continue;
        list.push({ kind: "article", article: a });
      }
    } else {
      for (const book of books) {
        list.push({
          kind: "book",
          book: {
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
          },
        });
      }
    }
  }

  return (
    <CoursesBrowser
      tabs={tabs.map((tab) => ({ id: tab.slug, label: tab.label, slug: tab.slug }))}
      itemsByTab={itemsByTab}
      eyebrow={settings["home.courses.eyebrow"]}
      title={settings["home.courses.title"]}
      buttonLabel={settings["home.courses.button"]}
    />
  );
}
