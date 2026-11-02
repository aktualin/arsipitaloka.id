import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import SocialEmbedPlayer from "@/components/social/SocialEmbedPlayer";
import { SocialPlatformBadge } from "@/components/social/SocialCard";
import { BookOpen, FileText, PanelsTopLeft, ArrowLeft } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import SiteHeader from "@/components/layout/SiteHeader";
import PageJsonLd from "@/components/seo/PageJsonLd";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  DEFAULT_OG_IMAGE,
  metaDescription,
  SITE_LOCALE,
  SITE_NAME,
} from "@/lib/seo";
import { resolveEmbedUrl, resolveVideoUrl } from "@/lib/social";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { id } = await params;
  const post = await prisma.socialMedia.findUnique({
    where: { id },
    select: {
      title: true,
      caption: true,
      coverUrl: true,
      updatedAt: true,
      published: true,
    },
  });

  if (!post) {
    return buildMetadata({
      title: "Media Sosial",
      description: "Video media sosial Arsip Pitaloka.",
      path: "/sosmed",
      noIndex: true,
    });
  }

  const description = metaDescription(
    post.caption ||
      `Video "${post.title}" di kanal media sosial Arsip Pitaloka.`,
  );

  // Tipe Open Graph "video" tidak termasuk tipe bawaan helper, jadi blok
  // Open Graph ditulis eksplisit di sini (canonical & Twitter tetap dari
  // helper yang sama).
  const base = buildMetadata({
    title: post.title,
    description,
    path: `/sosmed/${id}`,
    image: post.coverUrl || undefined,
    modifiedTime: post.updatedAt,
    noIndex: !post.published,
  });

  return {
    ...base,
    openGraph: {
      type: "video.other" as const,
      title: post.title,
      description,
      url: absoluteUrl(`/sosmed/${id}`),
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [
        {
          url: absoluteUrl(post.coverUrl || DEFAULT_OG_IMAGE),
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      // `modifiedTime` bukan bagian tipe Open Graph "video.other" di Next,
      // tapi tetap valid untuk Open Graph — jadi ditulis lewat assertion.
      modifiedTime: post.updatedAt.toISOString(),
    } as Metadata["openGraph"],
  };
}

async function SosmedDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const post = await prisma.socialMedia.findUnique({
    where: { id, published: true },
    include: {
      book: { select: { id: true, title: true, slug: true, coverUrl: true } },
      documentation: { select: { id: true, title: true, lead: true, photoUrl: true } },
      article: { select: { id: true, title: true, slug: true, type: true } },
    },
  });
  if (!post) notFound();

  const embedUrl = resolveEmbedUrl({
    platform: post.platform,
    videoId: post.videoId,
    embedUrl: post.embedUrl,
  });
  const videoUrl = resolveVideoUrl({
    platform: post.platform,
    videoId: post.videoId,
  });

  /** Data terstruktur video + breadcrumb halaman detail. */
  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.title,
    description: metaDescription(post.caption || post.title),
    thumbnailUrl: [absoluteUrl(post.coverUrl || DEFAULT_OG_IMAGE)],
    uploadDate: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    ...(embedUrl ? { embedUrl } : {}),
    ...(videoUrl ? { contentUrl: videoUrl } : {}),
    url: absoluteUrl(`/sosmed/${post.id}`),
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: absoluteUrl("/images/logo-pitaloka.png"),
    },
  };

  const detailBreadcrumb = breadcrumbJsonLd([
    { name: "Beranda", path: "/" },
    { name: "Media Sosial", path: "/sosmed" },
    { name: post.title, path: `/sosmed/${post.id}` },
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageJsonLd data={[videoJsonLd, detailBreadcrumb]} />
      <Link href="/sosmed" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft size={16} /> Kembali ke Media Sosial
      </Link>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <SocialEmbedPlayer
          platform={post.platform}
          videoId={post.videoId}
          embedUrl={post.embedUrl}
          title={post.title}
          author={post.author}
          autoPlay
          muted
          className="aspect-[9/16] max-h-[640px] w-full"
        />
      </div>

      <div className="mt-6 space-y-3">
        <SocialPlatformBadge platform={post.platform} />
        <h1 className="font-heading text-2xl font-bold text-black">{post.title}</h1>
        {post.author ? <p className="text-sm text-neutral-500">oleh {post.author}</p> : null}
        {post.caption ? <p className="mt-2 text-sm leading-relaxed text-neutral-700">{post.caption}</p> : null}
      </div>

      {(post.book || post.documentation || post.article) ? (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-600">Konten Terkait</h2>
          <div className="space-y-3">
            {post.book ? (
              <Link href={`/buku/e-book/${post.book.slug}`} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                <BookOpen size={20} className="text-maroon" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{post.book.title}</p>
                  <p className="text-xs text-neutral-500">Buku · E-Book</p>
                </div>
              </Link>
            ) : null}
            {post.documentation ? (
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                <FileText size={20} className="text-maroon" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{post.documentation.title}</p>
                  <p className="text-xs text-neutral-500">Dokumentasi</p>
                </div>
              </div>
            ) : null}
            {post.article ? (
              <Link href={`/artikel/${post.article.slug}`} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                <PanelsTopLeft size={20} className="text-maroon" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{post.article.title}</p>
                  <p className="text-xs text-neutral-500">Artikel</p>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SosmedDetailPage({ params }: Props) {
  return (
    <>
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 py-10">
      <Suspense fallback={<PageLoader />}>
        <SosmedDetail params={params} />
      </Suspense>
    </div>
    </>
  );
}
