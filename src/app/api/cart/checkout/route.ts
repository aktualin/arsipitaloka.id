import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateCartPrice } from "@/lib/pricing";
import { canAccessBook } from "@/lib/library";
import { getCart, clearCartBooks, removeFromCart } from "@/lib/cart";
import { siteUrl } from "@/lib/site-url";
import { scheduleOrderConfirmation } from "@/lib/order-notification";
import {
  createSnapTransaction,
  splitName,
  getMidtransConfig,
  isMidtransConfigured,
} from "@/lib/midtrans";

/**
 * POST /api/cart/checkout — checkout seluruh isi keranjang jadi SATU order,
 * lalu bayar sekali lewat Midtrans Snap.
 *
 * Tidak menerima daftar buku dari client: sumbernya keranjang DB milik user.
 * Buku yang diarsipkan / sudah dimiliki dibuang dari keranjang dan dilewati.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json(
      { error: "Silakan masuk terlebih dahulu." },
      { status: 401 },
    );
  }

  const cart = await getCart(userId);

  // Saring: buang buku yang diarsipkan atau sudah dimiliki (sekaligus bersihkan
  // dari keranjang), sisakan daftar yang benar-benar dibeli.
  const purchasable: CartLine[] = [];
  for (const entry of cart) {
    const owned = await canAccessBook(userId, entry.book.id);
    if (entry.book.archived || owned) {
      await removeFromCart(userId, entry.book.id);
      continue;
    }
    purchasable.push({
      bookId: entry.book.id,
      title: entry.book.title,
      priceUsd: entry.book.priceUsd,
    });
  }

  if (purchasable.length === 0) {
    return Response.json(
      { error: "Keranjang kosong atau semua buku sudah dimiliki." },
      { status: 400 },
    );
  }

  const price = await calculateCartPrice(purchasable.map((p) => p.priceUsd));

  // Semua gratis / total 0 → order langsung lunas tanpa gateway.
  if (price.total <= 0) {
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
          create: purchasable.map((p) => ({
            bookId: p.bookId,
            title: p.title,
            priceUsd: p.priceUsd,
            qty: 1,
          })),
        },
      },
    });

    await clearCartBooks(
      userId,
      purchasable.map((p) => p.bookId),
    );

    // Order gratis langsung lunas → kirim email konfirmasi (tanpa menunggu).
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
      {
        error:
          "Pembayaran online belum diaktifkan. Hubungi kami untuk pembelian manual.",
      },
      { status: 503 },
    );
  }
  if (!isMidtransConfigured(config)) {
    return Response.json(
      {
        error:
          "Konfigurasi Midtrans belum lengkap (server key / client key kosong).",
      },
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
        create: purchasable.map((p) => ({
          bookId: p.bookId,
          title: p.title,
          priceUsd: p.priceUsd,
          qty: 1,
        })),
      },
    },
  });

  const base = siteUrl();

  // Midtrans mewajibkan Σ item_details == gross_amount. Satu baris per buku
  // (harga IDR per buku dari price.lines), pajak sebagai item terpisah.
  const items = purchasable.map((p, i) => ({
    id: p.bookId,
    name: p.title,
    price: price.lines[i],
    quantity: 1,
  }));
  if (price.taxAmount > 0) {
    items.push({
      id: "tax",
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

type CartLine = { bookId: string; title: string; priceUsd: number };
