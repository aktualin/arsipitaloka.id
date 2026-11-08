import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculatePrice } from "@/lib/pricing";
import { canAccessBook } from "@/lib/library";
import { siteUrl } from "@/lib/site-url";
import { scheduleOrderConfirmation } from "@/lib/order-notification";
import {
  createSnapTransaction,
  splitName,
  getMidtransConfig,
  isMidtransConfigured,
} from "@/lib/midtrans";

/**
 * POST /api/checkout — buat order danSnap Midtrans.
 *
 * Body: { bookId }
 * Balas: { redirectUrl, orderId } (redirect ke halaman Snap) atau
 *        { free: true, orderId, redirectUrl } untuk buku gratis.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
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

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      priceUsd: true,
      isFree: true,
      archived: true,
    },
  });

  if (!book || book.archived) {
    return Response.json({ error: "Buku tidak ditemukan." }, { status: 404 });
  }

  // Sudah punya akses → arahkan ke pustaka.
  if (await canAccessBook(userId, book.id)) {
    return Response.json({
      alreadyOwned: true,
      redirectUrl: "/akun",
    });
  }

  // Sudah ada order yang masih menunggu pembayaran untuk buku ini → jangan
  // membuat order kedua (mencegah pembayaran dobel untuk buku yang sama).
  const pending = await prisma.order.findFirst({
    where: {
      userId,
      status: "PENDING",
      items: { some: { bookId: book.id } },
    },
    select: { id: true },
  });
  if (pending) {
    return Response.json(
      {
        error:
          "Anda sudah punya order yang menunggu pembayaran untuk buku ini.",
        orderId: pending.id,
        redirectUrl: `/akun/orders/${pending.id}`,
      },
      { status: 409 },
    );
  }

  const price = await calculatePrice(Number(book.priceUsd));

  // Buku gratis: order langsung lunas tanpa payment gateway.
  if (book.isFree || price.total <= 0) {
    const order = await prisma.order.create({
      data: {
        userId,
        status: "PAID",
        deliveryMethod: "DOWNLOAD",
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        usdToIdrRate: price.rate,
        paymentProvider: "free",
        paymentMethod: "FREE",
        paidAt: new Date(),
        items: {
          create: {
            bookId: book.id,
            title: book.title,
            priceUsd: book.priceUsd,
            qty: 1,
          },
        },
      },
    });

    // Buku gratis: order langsung lunas tanpa payment gateway. Email
    // konfirmasi dikirim setelah respons (tidak menambah waktu tunggu).
    scheduleOrderConfirmation(order.id);

    return Response.json({
      free: true,
      orderId: order.id,
      redirectUrl: `/akun/orders/${order.id}`,
    });
  }

  const config = getMidtransConfig();
  if (!config.enabled) {
    return Response.json(
      { error: "Pembayaran online belum diaktifkan. Hubungi kami untuk pembelian manual." },
      { status: 503 },
    );
  }
  if (!isMidtransConfigured(config)) {
    return Response.json(
      { error: "Konfigurasi Midtrans belum lengkap (server key / client key kosong)." },
      { status: 503 },
    );
  }

  const order = await prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      deliveryMethod: "DOWNLOAD",
      subtotal: price.subtotal,
      taxType: price.taxType,
      taxAmount: price.taxAmount,
      total: price.total,
      usdToIdrRate: price.rate,
      paymentProvider: "midtrans",
      paymentMethod: "SNAP",
      items: {
        create: {
          bookId: book.id,
          title: book.title,
          priceUsd: book.priceUsd,
          qty: 1,
        },
      },
    },
  });

  const base = siteUrl();

  // Midtrans memvalidasi jumlah item_details harus sama dengan gross_amount,
  // jadi pajak ikut dihitung sebagai item terpisah.
  const items = [
    {
      id: book.id,
      name: book.title,
      price: price.subtotal,
      quantity: 1,
    },
  ];
  if (price.taxAmount > 0) {
    items.push({
      id: `${book.id}-tax`,
      name: "Pajak",
      price: price.taxAmount,
      quantity: 1,
    });
  }

  const snap = await createSnapTransaction(config, {
    orderId: order.id,
    grossAmount: price.total,
    items,
    customer: {
      ...splitName(session?.user?.name),
      email: session?.user?.email ?? undefined,
    },
    finishUrl: `${base}/api/payment/callback/finish`,
    cancelUrl: `${base}/api/payment/callback/cancel`,
    errorUrl: `${base}/api/payment/callback/error`,
  });

  if (!snap.ok) {
    // Transaksi gagal dibuat → batalkan order supaya tidak menggantung.
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    return Response.json({ error: snap.error }, { status: 502 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentRef: snap.token },
  });

  return Response.json({
    orderId: order.id,
    token: snap.token,
    redirectUrl: snap.redirectUrl,
  });
}
