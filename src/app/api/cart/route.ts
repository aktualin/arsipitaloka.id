import { auth } from "@/auth";
import {
  addToCart,
  getCart,
  getCartCount,
  removeFromCart,
} from "@/lib/cart";

/**
 * API keranjang — dipakai komponen client (AddToCartButton, CartNavButton,
 * RemoveFromCartButton). Autentikasi ditangani di sini (bukan proxy.ts);
 * tanpa sesi → 401 JSON agar client bisa mengarahkan ke login.
 */

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getCart(userId);
  return Response.json({
    count: items.length,
    items: items.map((item) => ({
      bookId: item.book.id,
      title: item.book.title,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bookId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const bookId = body.bookId?.trim();
  if (!bookId) {
    return Response.json({ error: "Buku tidak dipilih." }, { status: 400 });
  }

  const result = await addToCart(userId, bookId);
  if (result.status === "invalid") {
    return Response.json(
      { error: "Buku tidak ditemukan.", count: result.count },
      { status: 404 },
    );
  }
  if (result.status === "free") {
    return Response.json(
      {
        ok: false,
        status: result.status,
        count: result.count,
        error: "Buku gratis — unduh langsung.",
      },
    );
  }
  if (result.status === "owned") {
    return Response.json(
      {
        ok: false,
        status: result.status,
        count: result.count,
        error: "Buku ini sudah Anda miliki.",
      },
    );
  }

  return Response.json({ ok: true, status: result.status, count: result.count });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bookId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const bookId = body.bookId?.trim();
  if (!bookId) {
    return Response.json({ error: "Buku tidak dipilih." }, { status: 400 });
  }

  const count = await removeFromCart(userId, bookId);
  return Response.json({ ok: true, count });
}
