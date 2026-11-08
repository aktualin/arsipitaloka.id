import { prisma } from "@/lib/prisma";
import { mapTransactionStatus } from "@/lib/midtrans";
import { clearCartBooks } from "@/lib/cart";
import { scheduleOrderConfirmation } from "@/lib/order-notification";

/**
 * Terapkan status transaksi Midtrans ke order.
 *
 * Dipakai oleh webhook notifikasi dan oleh polling status pembayaran, jadi
 * keduanya memakai aturan yang sama (order hanya berubah ke PAID satu kali).
 */
export async function applyTransactionStatus(
  orderId: string,
  transactionStatus: string | undefined,
  grossAmount?: string,
  fraudStatus?: string,
): Promise<
  | { ok: true; orderStatus: string; paid: boolean }
  | { ok: false; error: string }
> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      total: true,
      paidAt: true,
      userId: true,
      items: { select: { bookId: true } },
    },
  });

  if (!order) return { ok: false, error: "Order tidak ditemukan." };

  // Amount mismatch → jangan tandai lunas.
  if (grossAmount) {
    const expected = Number(order.total.toString());
    if (Number.isFinite(expected) && Math.round(expected) !== Math.round(Number(grossAmount))) {
      return { ok: false, error: "Nominal transaksi tidak cocok dengan order." };
    }
  }

  const mapped = mapTransactionStatus(transactionStatus);

  // Best practice Midtrans: transaksi sukses hanya dianggap sah kalau
  // `fraud_status` = accept. Status lain (challenge/reject) berarti masih
  // perlu verifikasi → jangan tandai lunas.
  const fraud = (fraudStatus ?? "").trim().toLowerCase();
  const fraudOk = fraud === "" || fraud === "accept";

  // Sudah lunas → tidak diubah lagi (mis. refund/void menyusul).
  if (order.status === "PAID" || order.status === "COMPLETED") {
    return { ok: true, orderStatus: order.status, paid: true };
  }

  if (mapped.paid && fraudOk) {
    // Transisi status dilakukan dengan `updateMany` bersyarat supaya hanya
    // satu pemanggil (webhook / callback / polling) yang benar-benar
    // mengubah status. Hasilnya dipakai sebagai penanda "sudah kirim email"
    // tanpa perlu kolom tambahan di database.
    const updated = await prisma.order.updateMany({
      where: { id: order.id, status: { notIn: ["PAID", "COMPLETED"] } },
      data: {
        status: "PAID",
        paidAt: order.paidAt ?? new Date(),
      },
    });

    // Buku yang baru lunas dikeluarkan dari keranjang (aman juga untuk order
    // satu-buku BuyButton: buku itu memang tidak ada di keranjang).
    await clearCartBooks(
      order.userId,
      order.items.map((item) => item.bookId),
    );

    // Email konfirmasi order dikirim tepat satu kali, hanya oleh pemanggil
    // yang berhasil mengubah status ke PAID. Kegagalan kirim tidak
    // menggagalkan pembayaran (fungsi ini tidak melempar error).
    if (updated.count === 1) {
      scheduleOrderConfirmation(order.id);
    }

    return { ok: true, orderStatus: "PAID", paid: true };
  }

  if (mapped.status === "CANCELLED" && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    return { ok: true, orderStatus: "CANCELLED", paid: false };
  }

  return { ok: true, orderStatus: order.status, paid: false };
}
