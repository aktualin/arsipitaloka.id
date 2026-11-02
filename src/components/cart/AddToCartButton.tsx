"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";

/**
 * Tombol "Keranjang" pada kartu buku.
 *
 * POST /api/cart {bookId}. Belum login (401) → diarahkan ke /login dengan
 * callback kembali ke halaman ini. Sukses → label sementara + event global
 * `cart:changed` supaya badge ikon tas di navbar ikut diperbarui.
 *
 * `className` dipakai kartu untuk mengatur lebar (mis. `w-full` supaya tombol
 * mengisi kolomnya), dan `iconOnly` untuk kartu sempit (katalog 2 kolom)
 * supaya label panjang tidak membuat baris tombol tidak rata.
 */
export default function AddToCartButton({
  bookId,
  className = "",
  wrapperClassName = "",
  iconOnly = false,
}: {
  bookId: string;
  /** Kelas tambahan untuk tombolnya. */
  className?: string;
  /** Kelas tambahan untuk pembungkus tombol (dipakai kartu untuk mengatur lebar). */
  wrapperClassName?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setNote(null);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });

      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      const data = (await res.json()) as {
        ok?: boolean;
        status?: "added" | "exists" | "owned" | "free" | "invalid";
        count?: number;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Gagal menambahkan ke keranjang.");
        setLoading(false);
        return;
      }

      const labels: Record<string, string> = {
        added: "✓ Ditambahkan",
        exists: "Di keranjang",
        owned: "Dimiliki",
      };
      setNote(labels[data.status ?? "added"] ?? "✓ Ditambahkan");
      setLoading(false);

      if (typeof data.count === "number") {
        window.dispatchEvent(
          new CustomEvent("cart:changed", { detail: { count: data.count } }),
        );
      }

      window.setTimeout(() => setNote(null), 2500);
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className={`min-w-0 ${wrapperClassName}`}>
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={iconOnly ? "Tambahkan ke keranjang" : undefined}
      aria-label={iconOnly ? "Tambahkan ke keranjang" : undefined}
      className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border border-maroon-dark px-3 text-xs font-medium text-maroon-dark transition hover:bg-maroon-dark hover:text-white disabled:opacity-60 ${
        iconOnly ? "w-9 shrink-0 px-0" : ""
      } ${className}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <ShoppingCart size={14} />
      )}
      {iconOnly ? null : error ? (
        <span className="truncate text-red-600">{error}</span>
      ) : (
        <span className="truncate">{note ?? "Keranjang"}</span>
      )}
    </button>
    </div>
  );
}
