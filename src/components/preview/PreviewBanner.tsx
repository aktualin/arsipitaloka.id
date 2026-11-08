import Link from "next/link";
import { Eye, ArrowLeft } from "lucide-react";

/**
 * Banner "Pratinjau" — muncul di halaman publik yang dibuka dengan
 * `?preview=1` oleh admin.
 *
 * Banner ini hanya dirender setelah pemeriksaan admin di server (lihat
 * `requireAdmin()`), jadi pengunjung biasa tidak pernah melihatnya.
 */
export default function PreviewBanner({
  backHref,
  backLabel = "Kembali ke daftar",
  note,
}: {
  /** Tautan kembali ke area admin. */
  backHref: string;
  /** Label tautan kembali. */
  backLabel?: string;
  /** Catatan tambahan, mis. "Konten ini belum tayang." */
  note?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-6">
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <Eye size={18} aria-hidden className="shrink-0" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">Pratinjau.</span>{" "}
          {note ??
            "Halaman ini hanya terlihat oleh admin dan belum tayang untuk pengunjung."}
        </p>
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          <ArrowLeft size={14} aria-hidden />
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
