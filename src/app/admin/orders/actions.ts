"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/require-admin";
import { scheduleOrderConfirmation } from "@/lib/order-notification";
import type { ActionState } from "@/lib/admin/action-state";

const STATUSES = ["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"];

/**
 * Ubah status order.
 * Idempoten: kalau order sudah PAID/COMPLETED, status tidak bisa
 * dikembalikan ke PENDING supaya pembeli tidak kehilangan hak akses file.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Unauthorized" };

  if (!STATUSES.includes(status)) {
    return { ok: false, message: "Status tidak dikenal" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paidAt: true },
  });
  if (!order) return { ok: false, message: "Order tidak ditemukan" };

  const sudahBayar = order.status === "PAID" || order.status === "COMPLETED";
  if (sudahBayar && (status === "PENDING" || status === "CANCELLED")) {
    return {
      ok: false,
      message: "Order yang sudah dibayar tidak bisa dikembalikan ke PENDING/CANCELLED",
    };
  }

  // Transisi ke "PAID" ditulis dengan `updateMany` bersyarat supaya email
  // konfirmasi hanya dikirim satu kali, walau admin mengubah status
  // berulang kali.
  let becamePaid = false;
  if (status === "PAID" && !sudahBayar) {
    const updated = await prisma.order.updateMany({
      where: { id: orderId, status: { notIn: ["PAID", "COMPLETED"] } },
      data: {
        status: "PAID",
        paidAt: order.paidAt ?? new Date(),
      },
    });
    becamePaid = updated.count === 1;
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as "PENDING",
        paidAt: status === "PAID" && !order.paidAt ? new Date() : order.paidAt,
      },
    });
  }

  // Pembeli menerima email konfirmasi saat order ditandai lunas (pembayaran
  // manual oleh admin). Kegagalan email tidak membatalkan perubahan status.
  if (becamePaid) {
    scheduleOrderConfirmation(orderId);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/akun");
  revalidatePath("/akun/orders");

  return { ok: true, message: `Status order diubah ke ${status}` };
}
