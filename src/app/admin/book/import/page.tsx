import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/require-admin";
import { BOOK_CSV_COLUMNS } from "@/lib/admin/book-csv";
import BookCsvImport from "@/components/admin/BookCsvImport";
import PageLoader from "@/components/PageLoader";

export const metadata = {
  title: "Import Buku — Admin",
};

/**
 * Import buku dari CSV (W24).
 *
 * Halaman ini berada di dalam <Suspense> milik layout admin, jadi:
 * - guard memakai `redirect()` saja (tidak boleh `notFound()`/`throw`),
 * - data dinamis dibaca setelah `await connection()`.
 */
export default function AdminBookImportPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminBookImportPageContent />
    </Suspense>
  );
}

async function AdminBookImportPageContent() {
  await connection();

  const admin = await requireAdmin();
  if (!admin) redirect("/login?callbackUrl=/admin/book/import");

  return (
    <div className="space-y-6">
      <Link
        href="/admin/book"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft size={16} /> Kembali ke daftar buku
      </Link>

      <header>
        <h1 className="font-heading text-2xl font-bold text-black">
          Import Buku (CSV)
        </h1>
        <p className="text-sm text-neutral-500">
          Buat banyak buku sekaligus dari berkas CSV. Baris yang slug-nya sudah
          dipakai otomatis dilewati, jadi mengimpor berkas yang sama dua kali
          tidak menghasilkan buku kembar.
        </p>
      </header>

      <BookCsvImport />

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-black">
          Format kolom yang didukung
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Nama kolom tidak case-sensitive. Alias Indonesia juga diterima
          (mis. <code>judul</code>, <code>harga</code>, <code>kategori</code>).
          Kolom yang tidak dikenal diabaikan.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Kolom</th>
                <th className="px-3 py-2 font-medium">Alias</th>
                <th className="px-3 py-2 font-medium">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {BOOK_CSV_COLUMNS.map((column) => (
                <tr
                  key={column.key}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-xs text-neutral-800">
                    {column.label}
                    {column.required ? (
                      <span className="ml-1 text-red-600">*</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-500">
                    {column.aliases.join(", ")}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{column.help}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          <span className="text-red-600">*</span> wajib diisi. Harga ditulis
          dalam Rupiah (angka, boleh "Rp50.000"). Buku yang ditandai gratis
          otomatis berharga 0.
        </p>
      </section>
    </div>
  );
}
