import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSmtpConfig,
  isSmtpUsable,
  sendHtmlEmail,
  type SmtpConfig,
} from "@/lib/smtp";
import { getSettingsSafe } from "@/lib/site-settings";
import { orderConfirmationMail } from "@/lib/mail/templates";
import { siteUrl } from "@/lib/site-url";

/**
 * Email notifikasi order.
 *
 * Satu email per order: dikirim ketika order sudah **lunas** (pembayaran
 * diterima lewat Midtrans, atau buku gratis yang diklaim, atau admin yang
 * menandai pembayaran manual). Email ini bersifat transaksional — bukan
 * newsletter — jadi tidak punya tautan unsubscribe.
 *
 * Aturan penting:
 * - Gagal kirim TIDAK boleh menggagalkan pemrosesan pembayaran. Semua
 *   kegagalan ditangkap dan dicatat di log.
 * - Pengiriman tidak boleh dobel. Pemanggil hanya memanggil fungsi ini
 *   setelah transisi status order ke "PAID" benar-benar terjadi (lihat
 *   `src/lib/payment-order.ts` yang memakai `updateMany` bersyarat).
 * - Kalau email notifikasi dimatikan di pengaturan, atau SMTP belum
 *   dikonfigurasi, email dilewati diam-diam.
 */

/** Nomor order yang ditampilkan ke pembeli (potongan id, sama seperti UI). */
export function orderNumber(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}

/**
 * Konteks pengiriman: konfigurasi SMTP + nama pengirim.
 *
 * Dibaca di scope request (bukan di dalam `after`) supaya tidak ada
 * pembacaan cache/DB yang tertunda setelah respons terkirim.
 */
type MailContext = {
  config: SmtpConfig;
  fromName: string;
};

async function resolveMailContext(): Promise<MailContext | null> {
  const settings = await getSettingsSafe();
  if (settings["order.email.enabled"] === "false") return null;

  const config = await getSmtpConfig();
  if (!isSmtpUsable(config)) return null;

  return {
    config,
    fromName: settings["order.email.fromName"]?.trim() || "Arsip Pitaloka",
  };
}

/**
 * Kirim email konfirmasi order memakai konteks yang sudah di-resolve.
 *
 * Tidak pernah melempar error — pemanggil (jalur pembayaran) tidak boleh
 * gagal karena mail server sedang bermasalah.
 */
async function sendOrderConfirmation(
  orderId: string,
  context: MailContext,
): Promise<boolean> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        subtotal: true,
        taxAmount: true,
        total: true,
        paymentMethod: true,
        paymentProvider: true,
        paidAt: true,
        items: {
          select: { title: true, qty: true, priceUsd: true },
        },
        user: { select: { email: true, name: true } },
      },
    });

    if (!order) return false;

    const recipient = (order.user.email ?? "").trim();
    if (!recipient) return false;

    const isFree =
      order.paymentProvider === "free" || Number(order.total.toString()) <= 0;

    const paymentMethod = isFree
      ? "Gratis"
      : order.paymentProvider
        ? `${order.paymentMethod ?? "Midtrans"} (${order.paymentProvider})`
        : (order.paymentMethod ?? "-");

    const mail = orderConfirmationMail({
      orderNumber: orderNumber(order.id),
      buyerName: order.user.name,
      lines: order.items.map((item) => ({
        title: item.title,
        qty: item.qty,
        amount: Number(item.priceUsd.toString()) * item.qty,
      })),
      subtotal: Number(order.subtotal.toString()),
      taxAmount: Number(order.taxAmount.toString()),
      total: Number(order.total.toString()),
      paymentMethod,
      paidAt: order.paidAt,
      orderUrl: `${siteUrl()}/akun/orders/${order.id}`,
      isFree,
    });

    const result = await sendHtmlEmail(context.config, {
      to: recipient,
      subject: isFree
        ? `Order #${orderNumber(order.id)} selesai — buku Anda siap dibaca`
        : `Pembayaran diterima — Order #${orderNumber(order.id)}`,
      html: mail.html,
      text: mail.text,
      fromName: context.fromName,
    });

    if (!result.ok) {
      console.error(
        `[order-email] gagal mengirim konfirmasi order #${orderNumber(order.id)}:`,
        result.error,
      );
      return false;
    }

    return true;
  } catch (error) {
    // Kegagalan email tidak boleh mengganggu pembayaran.
    console.error(`[order-email] error saat mengirim order #${orderId}:`, error);
    return false;
  }
}

/**
 * Kirim email konfirmasi order (menunggu sampai selesai).
 *
 * Dipakai kalau email memang harus terkirim sebelum pemanggil lanjut —
 * misalnya dari skrip atau skrip pengujian. Fungsi ini tidak pernah melempar
 * error; hasilnya `true` kalau email benar-benar terkirim.
 */
export async function notifyOrderPaid(orderId: string): Promise<boolean> {
  try {
    const context = await resolveMailContext();
    if (!context) return false;
    return await sendOrderConfirmation(orderId, context);
  } catch (error) {
    console.error(`[order-email] error saat mengirim order #${orderId}:`, error);
    return false;
  }
}

/**
 * Jadwalkan email konfirmasi tanpa menahan respons.
 *
 * Email dikirim lewat `after()` Next.js — jalannya setelah respons terkirim
 * ke pembeli, jadi pembeli tidak menunggu server SMTP yang lambat (±25 detik
 * di Exim rumahweb), dan callback Midtrans juga tidak ikut melambat.
 *
 * Kalau `after()` tidak bisa dipakai (mis. dipanggil di luar scope request),
 * email dikirim langsung tanpa ditunggu; error tetap ditangkap.
 */
export function scheduleOrderConfirmation(orderId: string): void {
  // Pengaturan & konfigurasi SMTP dibaca di scope request (dimulai sebelum
  // respons terkirim), lalu dipakai ulang saat email benar-benar dikirim.
  const contextPromise = resolveMailContext().catch((error) => {
    console.error(
      `[order-email] error menyiapkan email order #${orderId}:`,
      error,
    );
    return null;
  });

  try {
    // `after()` harus didaftarkan secara sinkron di dalam scope request.
    after(async () => {
      const context = await contextPromise;
      if (!context) return;
      await sendOrderConfirmation(orderId, context);
    });
  } catch (error) {
    console.error(
      `[order-email] tidak bisa menjadwalkan email order #${orderId}:`,
      error,
    );
    void contextPromise.then((context) =>
      context ? sendOrderConfirmation(orderId, context) : false,
    );
  }
}
