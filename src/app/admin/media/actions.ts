"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { deleteUpload } from "@/lib/admin/media";
import type { ActionState } from "@/lib/admin/action-state";

/**
 * Hapus satu berkas unggahan (rencana webadmin W17).
 *
 * Nama file comes from browser → `deleteUpload` sudah memeriksa path-nya
 * tetap berada di dalam `public/uploads`.
 */
export async function deleteMediaFile(
  relPath: string,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Unauthorized" };

  const ok = await deleteUpload(relPath);
  if (!ok) {
    return { ok: false, message: "Berkas tidak bisa dihapus." };
  }

  revalidatePath("/admin/media");
  return { ok: true, message: "Berkas dihapus." };
}
