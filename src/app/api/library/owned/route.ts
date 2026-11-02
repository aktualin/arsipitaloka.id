import { auth } from "@/auth";
import { getOwnedBookIds } from "@/lib/library";

/**
 * GET /api/library/owned — daftar id buku yang sudah dimiliki user.
 *
 * Dipakai komponen client (kartu buku di katalog & beranda) supaya buku
 * yang sudah dibeli tidak menampilkan tombol "Beli" lagi. Tanpa sesi →
 * daftar kosong (tidak error, supaya halaman publik tetap normal).
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ bookIds: [] });
  }

  const bookIds = await getOwnedBookIds(userId);
  return Response.json({ bookIds });
}
