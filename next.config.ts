import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  //_distDir bisa diganti lewat env supaya server uji (mock gateway) tidak
  // bentrok dengan dev server utama.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    agentFeedback: true,
    // Upload PDF e-book (maks 500 MB) lewat route di bawah matcher proxy.ts.
    // Default 10 MB membuat body ter-truncate → FormData gagal di-parse.
    proxyClientMaxBodySize: 512 * 1024 * 1024, // 512 MB
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Thumbnail YouTube (disimpan dari field YouTube di admin).
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      // Banner CTA (aset negara.co.id).
      { protocol: "https", hostname: "assets.negara.co.id" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
