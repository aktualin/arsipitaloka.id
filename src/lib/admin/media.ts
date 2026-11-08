import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Berkas media yang diunggah admin.
 *
 * Gambar disimpan di `public/uploads` (supaya bisa dipakai `<Image>`), PDF
 * e-book disimpan di `storage/private` (TIDAK dilayani Next.js — hanya lewat
 * route `/api/read` & `/api/download`).
 *
 * Halaman `/admin/media` memakai daftar ini supaya admin bisa tahu berkas apa
 * yang sudah diunggah dan membersihkannya kalau tidak dipakai lagi.
 */

export type MediaFile = {
  /** Path relatif terhadap folder uploads, mis. "2026/01/cover-buku.jpg". */
  relPath: string;
  /** URL publik (hanya untuk gambar di `public/uploads`). */
  url: string;
  name: string;
  /** Ukuran berkas dalam byte. */
  size: number;
  /** Tanggal modifikasi terakhir. */
  modifiedAt: Date;
  kind: "image" | "document" | "other";
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);
const DOCUMENT_EXT = new Set([".pdf", ".epub", ".doc", ".docx", ".zip"]);

/** Folder tempat berkas unggahan disimpan (relatif terhadap root proyek). */
export function uploadsDir(): string {
  return path.join(process.cwd(), "public", "uploads");
}

function kindOf(fileName: string): MediaFile["kind"] {
  const ext = path.extname(fileName).toLowerCase();
  if (IMAGE_EXT.has(ext)) return "image";
  if (DOCUMENT_EXT.has(ext)) return "document";
  return "other";
}

/**
 * Daftar seluruh berkas di `public/uploads` (rekursif), yang terbaru dulu.
 * Folder yang tidak ada dianggap kosong — bukan error.
 */
export async function listUploads(): Promise<MediaFile[]> {
  const root = uploadsDir();
  const out: MediaFile[] = [];

  async function walk(dir: string, prefix: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = prefix ? path.posix.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
        continue;
      }
      if (!entry.isFile()) continue;

      let stat;
      try {
        stat = await fs.stat(full);
      } catch {
        continue;
      }

      out.push({
        relPath: rel,
        url: `/uploads/${rel}`,
        name: entry.name,
        size: stat.size,
        modifiedAt: stat.mtime,
        kind: kindOf(entry.name),
      });
    }
  }

  await walk(root, "");
  out.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  return out;
}

/**
 * Hapus berkas di `public/uploads`.
 *
 * `relPath` datang dari browser, jadi harus dicek ulang: path absolut atau
 * `..` di luar folder uploads tidak boleh bisa dihapus.
 */
export async function deleteUpload(relPath: string): Promise<boolean> {
  const root = uploadsDir();
  const target = path.resolve(root, relPath);

  // Harus tetap di dalam folder uploads.
  if (target !== root && !target.startsWith(root + path.sep)) return false;

  try {
    await fs.unlink(target);
    return true;
  } catch {
    return false;
  }
}

/** Ukuran berkas dalam format yang enak dibaca. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
