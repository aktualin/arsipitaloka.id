import { Suspense } from "react";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { requireUser, getOwnedBookIds } from "@/lib/library";
import { getCart } from "@/lib/cart";
import { calculateCartPrice } from "@/lib/pricing";
import { getMidtransConfig } from "@/lib/midtrans";
import Footer from "@/components/home/Footer";
import RemoveFromCartButton from "@/components/cart/RemoveFromCartButton";
import CartCheckoutButton from "@/components/cart/CartCheckoutButton";
import SiteHeader from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Keranjang — Arsip Pitaloka",
};

function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CartPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <SiteHeader />
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
            <p className="text-sm text-neutral-500">Memuat keranjang…</p>
          </main>
        }
      >
        <CartPageContent />
      </Suspense>
      <Footer />
    </div>
  );
}

async function CartPageContent() {
  await connection();

  const user = await requireUser();
  const cart = await getCart(user.id);

  // Buku yang sudah dimiliki user tidak boleh dibeli lagi — itemnya
  // ditandai di daftar dan tidak ikut dihitung harga/checkout.
  const ownedIds = new Set(
    await getOwnedBookIds(
      user.id,
      cart.map((entry) => entry.book.id),
    ),
  );

  // Hanya buku yang masih bisa dibeli yang ikut dihitung harga/checkout.
  const buyable = cart.filter(
    (entry) => !entry.book.archived && !ownedIds.has(entry.book.id),
  );
  const price = await calculateCartPrice(buyable.map((e) => e.book.priceUsd));
  const config = await getMidtransConfig();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-black">
          <ShoppingCart size={24} /> Keranjang
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Buku yang Anda pilih untuk dibeli. Bayar sekaligus lewat Midtrans.
        </p>
      </header>

      {cart.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <p className="font-medium text-black">Keranjang Anda kosong</p>
          <p className="mt-1 text-sm text-neutral-500">
            Jelajahi katalog dan tambahkan buku ke keranjang.
          </p>
          <Link
            href="/buku"
            className="mt-4 inline-block rounded-full bg-maroon-dark px-5 py-2 text-sm font-medium text-white"
          >
            Lihat Katalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* Daftar item */}
          <ul className="space-y-4">
            {cart.map((entry) => {
              const { book } = entry;
              const href = `/buku/e-book/${book.slug}`;
              const owned = ownedIds.has(book.id);
              return (
                <li
                  key={entry.id}
                  className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[#3d2b2e]">
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h2 className="font-semibold text-black">
                      <Link href={href} className="hover:underline">
                        {book.title}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      by {book.author}
                    </p>
                    {book.archived ? (
                      <p className="mt-1 text-xs text-red-600">
                        Buku tidak lagi tersedia — akan dilewati saat checkout.
                      </p>
                    ) : null}
                    {owned ? (
                      <p className="mt-1 text-xs text-neutral-600">
                        Sudah Anda miliki — tidak bisa dibeli lagi, akan dilewati
                        saat checkout.{" "}
                        <Link href="/akun" className="underline">
                          Buka Pustaka Saya
                        </Link>
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-sm font-semibold text-black">
                        {book.isFree ? "Gratis" : formatIdr(Number(book.priceUsd))}
                      </span>
                      <RemoveFromCartButton bookId={book.id} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Ringkasan */}
          <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold text-black">Ringkasan</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <dt>Jumlah buku</dt>
                <dd>{buyable.length}</dd>
              </div>
              {config.enabled ? (
                <>
                  <div className="flex justify-between text-neutral-600">
                    <dt>Subtotal</dt>
                    <dd>{formatIdr(price.subtotal)}</dd>
                  </div>
                  {price.taxAmount > 0 ? (
                    <div className="flex justify-between text-neutral-600">
                      <dt>Pajak</dt>
                      <dd>{formatIdr(price.taxAmount)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-neutral-100 pt-2 text-base font-bold text-black">
                    <dt>Total</dt>
                    <dd>{formatIdr(price.total)}</dd>
                  </div>
                </>
              ) : (
                <p className="text-xs text-neutral-500">
                  Pembayaran online belum diaktifkan. Hubungi kami untuk
                  pembelian manual.
                </p>
              )}
            </dl>

            {buyable.length > 0 ? (
              <div className="mt-5">
                <CartCheckoutButton />
              </div>
            ) : (
              <p className="mt-5 text-xs text-neutral-500">
                Tidak ada buku yang bisa dibeli di keranjang.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
