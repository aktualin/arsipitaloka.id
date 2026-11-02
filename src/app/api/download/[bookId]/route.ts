import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessBook } from "@/lib/library";
import { serveBookFile } from "@/lib/book-file";

/**
 * GET /api/download/[bookId] — unduh file e-book.
 *
 * Akses HANYA untuk user yang login DAN sudah membeli buku tersebut dengan
 * order berstatus PAID/SHIPPED/COMPLETED. Buku gratis harus diklaim dulu
 * (POST /api/checkout → order PAID) — tanpa itu jawabannya 403.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await params;

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true, title: true, fileUrl: true },
  });
  if (!book) {
    return Response.json({ error: "Buku tidak ditemukan" }, { status: 404 });
  }

  const allowed = await canAccessBook(userId, bookId);
  if (!allowed) {
    return Response.json(
      { error: "Buku ini belum Anda beli" },
      { status: 403 },
    );
  }

  const ext = book.fileUrl?.split(".").pop()?.toLowerCase() ?? "pdf";
  const filename = `${book.title.replace(/[^\w\s.-]/g, "").trim() || "ebook"}.${ext}`;

  return serveBookFile(book.fileUrl ?? "", filename, "attachment");
}
