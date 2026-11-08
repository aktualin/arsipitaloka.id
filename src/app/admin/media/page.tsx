import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { formatBytes, listUploads } from "@/lib/admin/media";
import DeleteMediaButton from "@/components/admin/DeleteMediaButton";
import PageLoader from "@/components/PageLoader";

export const metadata = {
  title: "Media — Admin",
};

/**
 * Daftar berkas unggahan (rencana webadmin W17).
 *
 * Folder `public/uploads` berisi gambar yang diunggah dari form admin
 * (sampul buku, cover artikel, dsb). Halaman ini dipakai untuk melihat file
 * apa saja yang ada dan membersihkannya kalau sudah tidak dipakai.
 *
 * Catatan: di Vercel (serverless) folder ini bersifat sementara — file hilang
 * saat instance di-restart. Untuk produksi jangka panjang, file sebaiknya
 * disimpan di object storage (URL di database tetap sama).
 */
export default function AdminMediaPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminMediaPageContent />
    </Suspense>
  );
}

async function AdminMediaPageContent() {
  await connection();

  const admin = await requireAdmin();
  if (!admin) return null;

  const files = await listUploads();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-black">Media</h1>
        <p className="text-sm text-neutral-500">
          Berkas yang diunggah dari form admin. Hapus berkas yang sudah tidak
          dipakai.
        </p>
      </header>

      {files.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          Belum ada berkas yang diunggah.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <li
              key={file.relPath}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
            >
              {file.kind === "image" ? (
                <Image
                  src={file.url}
                  alt={file.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[10px] uppercase text-neutral-500">
                  {file.kind === "document" ? "Dok" : "Berkas"}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">
                  {file.name}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {file.relPath} · {formatBytes(file.size)}
                </p>
                <p className="mt-1">
                  <DeleteMediaButton relPath={file.relPath} name={file.name} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
