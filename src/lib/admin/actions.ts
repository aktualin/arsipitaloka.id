"use server";

import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./require-admin";
import { ENTITIES } from "./entities";
import { getDelegate } from "./delegates";
import { coerceField, pruneEmpty } from "./coerce";
import { slugify } from "@/lib/slug";
import { parseTikTok } from "@/lib/tiktok";
import { checkTikTokVideo } from "@/lib/tiktok-oembed";
import { parseSocialRef, resolveThumbnailUrl } from "@/lib/social";
import {
  buildContentBroadcast,
  broadcastToSubscribers,
} from "@/lib/newsletter";
import type { ActionState } from "./action-state";

/**
 * Simpan entitas (create/update). `id` null = buat baru.
 * Dipakai lewat `useActionState`, jadi tanda tangannya:
 *   (key, id, prevState, formData) → state baru
 */
export async function saveEntity(
  key: string,
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Unauthorized" };

  const def = ENTITIES[key];
  if (!def) return { ok: false, message: "Entitas tidak dikenal" };

  const delegate = getDelegate(def.model);
  if (!delegate) return { ok: false, message: "Entitas tidak dikenal" };

  if (!id && def.canCreate === false) {
    return { ok: false, message: `Tidak bisa menambah ${def.singular}` };
  }
  if (id && def.canEdit === false) {
    return { ok: false, message: `Tidak bisa mengubah ${def.singular}` };
  }

  const raw: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  // Embed TikTok/YouTube/Instagram dibaca lebih awal — judulnya dipakai
  // otomatis untuk mengisi field "Judul" (wajib di Media Sosial), jadi admin
  // cukup menempelkan kode embed tanpa mengisi judul manual.
  const embedSource =
    def.key === "social" || def.key === "tiktok"
      ? String(formData.get("embedUrl") ?? "").trim()
      : "";
  const socialRef = def.key === "social" ? parseSocialRef(embedSource) : null;
  const tiktokRef = def.key === "tiktok" ? parseTikTok(embedSource) : null;
  const embedTitle = socialRef?.title ?? tiktokRef?.title ?? null;

  for (const field of def.fields) {
    if (field.readOnly) continue;

    // Field boolean mengirim hidden "0" + checkbox "1" — ambil nilai yang
    // true. Kalau pakai formData.get(), nilainya selalu "0" karena hidden
    // input lebih dulu di DOM.
    const rawValue =
      field.type === "boolean"
        ? formData
            .getAll(field.name)
            .some((v) => v === "1" || v === "on" || v === "true")
        : formData.get(field.name);

    let value = coerceField(field, rawValue);
    // Kolom dengan nilai bawaan (mis. "order" = 0) tidak boleh jadi null
    // walau form dibiarkan kosong — kolomnya wajib di DB.
    if (
      field.type !== "boolean" &&
      field.defaultValue !== undefined &&
      (value === null || value === undefined || value === "")
    ) {
      value = field.defaultValue;
    }
    // Judul media sosial boleh dikosongkan kalau kode embed-nya menyertakan
    // judul (atribut `title`). Kalau embed tidak punya judul, buat label
    // otomatis dari platform + id video supaya tetap bisa disimpan.
    if (
      def.key === "social" &&
      field.name === "title" &&
      (value === null || value === undefined || value === "")
    ) {
      value =
        embedTitle ??
        (socialRef?.videoId
          ? `Video ${socialRef.platform.toUpperCase()} ${socialRef.videoId.slice(-6)}`
          : value);
    }

    // Penulis media sosial juga diambil otomatis dari link/embed.
    if (
      def.key === "social" &&
      field.name === "author" &&
      (value === null || value === undefined || value === "") &&
      socialRef?.author
    ) {
      value = socialRef.author;
    }

    if (field.required && (value === null || value === "" || value === undefined)) {
      fieldErrors[field.name] = `${field.label} wajib diisi`;
    }
    raw[field.name] = value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Periksa kembali isian yang ditandai.",
      fieldErrors,
    };
  }

  // Slug dibuat otomatis dari judul/nama, dan tetap unik: kalau slug dasar
  // sudah dipakai, ditambahkan angka (e-book → e-book-2 → e-book-3).
  const slugField = def.fields.find((field) => field.slugFrom);
  if (slugField) {
    const sourceValue = String(raw[slugField.slugFrom!] ?? "");
    const submitted = String(raw[slugField.name] ?? "");
    let slug = slugify(submitted || sourceValue);

    if (!slug) {
      fieldErrors[slugField.name] = "Slug tidak bisa dibuat dari isian ini.";
    } else {
      let candidate = slug;
      let counter = 2;
      // eslint-disable-next-line no-await-in-loop
      while (await slugTaken(delegate, candidate, id)) {
        candidate = `${slug}-${counter}`;
        counter += 1;
        if (counter > 999) break;
      }
      raw[slugField.name] = candidate;
    }
  }

  // TikTok: admin cukup menempelkan share link / kode embed. Id video,
  // judul, dan nama author diambil otomatis dari link tersebut, dan link
  // yang menunjuk video yang tidak ada ditolak.
  let tiktokWarning = "";
  if (def.key === "tiktok") {
    const source = String(raw.embedUrl ?? "").trim();
    const ref = tiktokRef ?? parseTikTok(source);

    const check = await checkTikTokVideo(source);
    if (check.status === "notfound") {
      return {
        ok: false,
        message:
          "Video TikTok tidak ditemukan. Cek link-nya, atau pakai link video yang sudah tayang.",
        fieldErrors: { embedUrl: "Video tidak ditemukan" },
      };
    }
    if (check.status === "unknown") {
      // TikTok sedang membatasi akses (rate-limit) → status video tidak bisa
      // dipastikan. Tetap disimpan, tapi admin diberi tahu.
      tiktokWarning =
        " Status video tidak bisa dicek karena TikTok sedang membatasi akses — periksa nanti di halaman postingan.";
    }

    const videoId = check.videoId ?? ref.videoId;
    const title =
      String(raw.title ?? "").trim() || check.title || ref.title || "";
    const author =
      String(raw.author ?? "").trim() || check.author || ref.author || "";

    if (!videoId) {
      return {
        ok: false,
        message:
          "Link TikTok belum bisa dibaca. Tempel share link yang memuat /video/<id>, kode embed player/v1/<id>, atau kode embed lengkap.",
        fieldErrors: { embedUrl: "Link TikTok tidak dikenali" },
      };
    }

    raw.videoId = videoId;
    raw.title = title || `Postingan TikTok ${videoId.slice(-6)}`;
    raw.author = author;
    // Simpan URL player yang sudah dinormalisasi (bukan kode embed mentah),
    // supaya form admin berikutnya menampilkan link yang rapi.
    raw.embedUrl = ref.embedUrl ?? String(raw.embedUrl ?? "").trim();
  }

  // Media sosial multi-platform: platform + id video + URL embed diambil
  // otomatis dari link/kode embed yang ditempel. Cover (thumbnail) diisi
  // otomatis bila dibiarkan kosong.
  if (def.key === "social") {
    const source = String(raw.embedUrl ?? "").trim();
    const ref = socialRef ?? parseSocialRef(source);

    if (!ref.videoId) {
      return {
        ok: false,
        message:
          "Link media sosial belum bisa dibaca. Tempel share link TikTok/YouTube/Instagram atau kode embed lengkap.",
        fieldErrors: { embedUrl: "Link tidak dikenali" },
      };
    }

    raw.platform = ref.platform;
    raw.videoId = ref.videoId;
    raw.embedUrl = ref.embedUrl ?? source;

    if (!String(raw.author ?? "").trim() && ref.author) {
      raw.author = ref.author;
    }

    if (!String(raw.coverUrl ?? "").trim()) {
      let tiktokThumbnail: string | null = null;
      if (ref.platform === "tiktok") {
        const check = await checkTikTokVideo(source);
        tiktokThumbnail = check.thumbnailUrl;
      }
      const thumbnail = resolveThumbnailUrl({
        platform: ref.platform,
        videoId: ref.videoId,
        tiktokThumbnail,
      });
      if (thumbnail) raw.coverUrl = thumbnail;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Periksa kembali isian yang ditandai.",
      fieldErrors,
    };
  }

  const data = pruneEmpty(raw);

  // Kolom wajib di DB tapi boleh dikosongkan di form → default 0.
  if (def.key === "book" && data.priceUsd === undefined) data.priceUsd = 0;

  // Data sebelum disimpan — dipakai untuk menentukan apa yang berubah
  // (mis. konten yang baru pertama kali tayang).
  const before = id
    ? ((await delegate.findUnique({ where: { id } })) as Record<string, unknown> | null)
    : null;

  let saved: Record<string, unknown> | null = null;

  try {
    if (id) {
      saved = (await delegate.update({ where: { id }, data })) as Record<
        string,
        unknown
      >;
    } else {
      saved = (await delegate.create({ data })) as Record<string, unknown>;
    }
  } catch (error: any) {
    if (error?.code === "P2002") {
      return {
        ok: false,
        message: `Nilai unik sudah dipakai — ${def.label} ini sudah ada.`,
      };
    }
    if (error?.code === "P2003") {
      return {
        ok: false,
        message: "Relasi tidak valid — pastikan referensi yang dipilih sudah ada.",
      };
    }
    console.error(error);
    return { ok: false, message: "Gagal menyimpan. Coba lagi." };
  }

  revalidatePath("/");
  revalidatePath(`/admin/${key}`);
  revalidatePath("/akun");
  updateTag("content");

  // Newsletter: kabari pelanggan lewat email begitu konten baru tayang atau
  // isinya berubah. Kegagalan kirim tidak menggagalkan penyimpanan konten.
  const newsletterNote = await maybeBroadcastNewsletter(
    def.key,
    before,
    saved,
  );

  return {
    ok: true,
    message: `${def.label} berhasil disimpan.${tiktokWarning}${newsletterNote}`,
  };
}

/**
 * Kirim pengumuman newsletter untuk konten yang baru dibuat / berubah.
 *
 * Kirim kalau:
 * - konten baru dibuat dan langsung tayang, atau
 * - konten yang tadinya belum tayang sekarang tayang, atau
 * - judul/ringkasan/isi konten berubah (buku, berita, dokumentasi).
 */
async function maybeBroadcastNewsletter(
  key: string,
  before: Record<string, unknown> | null,
  saved: Record<string, unknown> | null,
): Promise<string> {
  if (!saved) return "";
  if (!["book", "article", "documentation"].includes(key)) return "";

  const record = saved as unknown as {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    lead?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    photoUrl?: string | null;
    published?: boolean;
    type?: string | null;
  };

  if (!record.title || !record.slug) return "";
  if (record.published === false) return "";

  const previous = (before ?? {}) as Partial<typeof record>;

  const changed =
    !before ||
    previous.title !== record.title ||
    (previous.excerpt ?? null) !== (record.excerpt ?? null) ||
    (previous.lead ?? null) !== (record.lead ?? null) ||
    (previous.description ?? null) !== (record.description ?? null) ||
    previous.published !== record.published;

  if (!changed) return "";

  const input = buildContentBroadcast(key, {
    title: record.title,
    slug: record.slug,
    excerpt: record.excerpt ?? null,
    lead: record.lead ?? null,
    description: record.description ?? null,
    coverUrl: record.coverUrl ?? null,
    photoUrl: record.photoUrl ?? null,
    published: record.published,
    type: record.type ?? null,
  });

  if (!input) return "";

  try {
    const result = await broadcastToSubscribers(input);
    if (!result.ok) return "";
    if (result.total === 0) return "";
    return ` Newsletter: ${result.message}`;
  } catch (error) {
    console.error("Gagal mengirim newsletter", error);
    return "";
  }
}

/**
 * Slug sudah dipakai entitas lain? (dengan pengecualian record yang sedang
 * diedit supaya slug tidak bentrok dengan dirinya sendiri).
 */
async function slugTaken(
  delegate: { findFirst(args: any): Promise<any> },
  slug: string,
  currentId: string | null,
): Promise<boolean> {
  const found = await delegate.findFirst({ where: { slug } });
  if (!found) return false;
  return !currentId || String(found.id) !== currentId;
}

/** Hapus entitas. Buku yang sudah pernah dipesan tidak bisa dihapus (FK Restrict). */
export async function deleteEntity(
  key: string,
  id: string,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Unauthorized" };

  const def = ENTITIES[key];
  if (!def) return { ok: false, message: "Entitas tidak dikenal" };

  const delegate = getDelegate(def.model);
  if (!delegate) return { ok: false, message: "Entitas tidak dikenal" };

  if (def.canDelete === false) {
    return { ok: false, message: `Tidak bisa menghapus ${def.singular}` };
  }

  try {
    await delegate.delete({ where: { id } });
  } catch (error: any) {
    if (error?.code === "P2003") {
      return {
        ok: false,
        message: `${def.label} ini sudah dipakai data lain, tidak bisa dihapus. Arsipkan saja.`,
      };
    }
    console.error(error);
    return { ok: false, message: "Gagal menghapus. Coba lagi." };
  }

  revalidatePath("/");
  revalidatePath(`/admin/${key}`);
  revalidatePath("/akun");
  updateTag("content");

  return { ok: true, message: `${def.label} berhasil dihapus.` };
}

/**
 * Bulk action: hapus beberapa baris sekaligus (W23).
 *
 * Dipakai sebagai `action` pada form, jadi tanda tangannya
 * `(key, formData)`. Baris yang gagal (mis. buku yang sudah pernah dipesan
 * — FK Restrict) dilaporkan lewat query `flash`, bukan menggagalkan seluruh
 * proses.
 */
export async function bulkDeleteEntity(
  key: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) {
    redirect(`/admin/${key}?flash=${encodeURIComponent("err:Tidak diizinkan.")}`);
  }

  const def = ENTITIES[key];
  const delegate = def ? getDelegate(def.model) : undefined;
  const ids = formData
    .getAll("ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!def || !delegate || def.canDelete === false || ids.length === 0) {
    redirect(
      `/admin/${key}?flash=${encodeURIComponent(
        "err:Bulk action tidak tersedia untuk data ini.",
      )}`,
    );
  }

  let deleted = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await delegate.delete({ where: { id } });
      deleted += 1;
    } catch (error: any) {
      failed += 1;
      if (error?.code !== "P2003") console.error(error);
    }
  }

  revalidatePath("/");
  revalidatePath(`/admin/${key}`);
  revalidatePath("/akun");
  updateTag("content");

  const message =
    failed === 0
      ? `${deleted} ${def.label} berhasil dihapus.`
      : `${deleted} ${def.label} dihapus, ${failed} gagal — sudah dipakai data lain (arsipkan saja).`;

  // Kembalikan ke daftar dengan filter & urutan yang sama.
  const back = new URLSearchParams();
  for (const name of ["q", "platform", "type", "sort", "dir"]) {
    const value = formData.get(`_${name}`);
    if (value) back.set(name, String(value));
  }
  back.set("flash", `ok:${message}`);

  redirect(`/admin/${key}?${back.toString()}`);
}
