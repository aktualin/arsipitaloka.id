import { cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/site-settings-defaults";

export { DEFAULT_SETTINGS };

export type SettingField = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "boolean"
    | "lines"
    | "secret"
    | "select"
    | "richtext"
    | "image"
    | "number";
  group: string;
  help?: string;
  options?: string[];
};

/**
 * Skema pengaturan situs. Kunci WAJIB sama dengan yang dipakai seed dan
 * landing page — kalau menambah key baru, tambahkan juga default-nya di
 * `DEFAULT_SETTINGS`.
 */
export const SETTINGS_SCHEMA: SettingField[] = [
  { key: "company.name", label: "Nama perusahaan", type: "text", group: "Profil" },
  { key: "company.tagline", label: "Tagline", type: "text", group: "Profil" },
  { key: "company.description", label: "Deskripsi singkat", type: "richtext", group: "Profil" },
  { key: "company.address", label: "Alamat", type: "text", group: "Profil" },
  { key: "company.phone", label: "Telepon", type: "text", group: "Profil" },
  { key: "company.email", label: "Email", type: "text", group: "Profil" },
  { key: "company.logoUrl", label: "Logo perusahaan", type: "image", group: "Profil", help: "Unggah gambar; disimpan langsung di database." },
  { key: "company.copyright", label: "Teks copyright", type: "text", group: "Profil" },

  { key: "home.categories.eyebrow", label: "Judul kecil kategori", type: "text", group: "Halaman Utama" },
  { key: "home.categories.title", label: "Judul kategori", type: "text", group: "Halaman Utama" },
  { key: "home.categories.button", label: "Tombol kategori", type: "text", group: "Halaman Utama" },
  { key: "home.courses.eyebrow", label: "Judul kecil buku", type: "text", group: "Halaman Utama" },
  { key: "home.courses.title", label: "Judul buku", type: "text", group: "Halaman Utama" },
  { key: "home.courses.button", label: "Tombol buku", type: "text", group: "Halaman Utama" },
  { key: "home.courses.readButton", label: "Tombol baca buku", type: "text", group: "Halaman Utama" },
  { key: "home.courses.priceSuffix", label: "Akufiks harga", type: "text", group: "Halaman Utama" },
  { key: "home.viral.eyebrow", label: "Judul kecil #ViralForJustice", type: "text", group: "Halaman Utama" },
  { key: "home.viral.title", label: "Judul #ViralForJustice", type: "text", group: "Halaman Utama" },
  { key: "home.viral.subtitle", label: "Nama di #ViralForJustice", type: "text", group: "Halaman Utama" },
  { key: "home.viral.body", label: "Paragraf #ViralForJustice", type: "richtext", group: "Halaman Utama" },
  { key: "home.viral.image", label: "Gambar #ViralForJustice", type: "image", group: "Halaman Utama", help: "Unggah gambar; disimpan langsung di database." },
  { key: "home.documentation.eyebrow", label: "Judul kecil dokumentasi", type: "text", group: "Halaman Utama" },
  { key: "home.documentation.signature", label: "Nama penanda dokumentasi", type: "text", group: "Halaman Utama" },

  { key: "social.catalog.eyebrow", label: "Judul kecil media sosial", type: "text", group: "Media Sosial" },
  { key: "social.catalog.title", label: "Judul media sosial", type: "text", group: "Media Sosial" },
  { key: "social.catalog.subtitle", label: "Subjudul media sosial", type: "textarea", group: "Media Sosial" },

  { key: "footer.browse.title", label: "Judul kolom Browse", type: "text", group: "Footer" },
  { key: "footer.browse.links", label: "Tautan Browse (satu per baris)", type: "lines", group: "Footer" },
  { key: "footer.platform.title", label: "Judul kolom Platform", type: "text", group: "Footer" },
  { key: "footer.platform.links", label: "Tautan Platform (satu per baris)", type: "lines", group: "Footer" },
  { key: "footer.subscribe.placeholder", label: "Placeholder email", type: "text", group: "Footer" },
  { key: "footer.subscribe.button", label: "Tombol langganan", type: "text", group: "Footer" },
  { key: "footer.subscribe.text", label: "Teks langganan", type: "textarea", group: "Footer" },
  { key: "footer.legal.privacy", label: "Tautan Privacy Policy", type: "text", group: "Footer" },
  { key: "footer.legal.terms", label: "Tautan Terms of Service", type: "text", group: "Footer" },
  { key: "footer.legal.cookies", label: "Tautan Cookies Settings", type: "text", group: "Footer" },

  { key: "company.vision", label: "Visi", type: "richtext", group: "Copy Landing Page" },
  { key: "company.mission", label: "Misi", type: "richtext", group: "Copy Landing Page" },
  { key: "company.social.tiktok", label: "Tautan TikTok", type: "text", group: "Copy Landing Page" },
  { key: "company.social.youtube", label: "Tautan YouTube", type: "text", group: "Copy Landing Page" },
  { key: "company.social.instagram", label: "Tautan Instagram", type: "text", group: "Copy Landing Page" },

  {
    key: "contact.smtp.enabled",
    label: "Aktifkan formulir kontak (SMTP)",
    type: "boolean",
    group: "Kontak / SMTP",
    help: "Kalau mati, formulir kontak tidak mengirim email.",
  },
  { key: "contact.smtp.host", label: "SMTP Host", type: "text", group: "Kontak / SMTP", help: "mis. smtp.gmail.com" },
  { key: "contact.smtp.port", label: "SMTP Port", type: "text", group: "Kontak / SMTP", help: "587 (STARTTLS) atau 465 (SSL)" },
  { key: "contact.smtp.user", label: "SMTP User", type: "text", group: "Kontak / SMTP" },
  { key: "contact.smtp.pass", label: "SMTP Password", type: "secret", group: "Kontak / SMTP", help: "Rahasia — disimpan di server saja." },
  { key: "contact.smtp.from", label: "Email pengirim (From)", type: "text", group: "Kontak / SMTP", help: "Kosongkan untuk memakai SMTP User." },
  { key: "contact.smtp.to", label: "Email tujuan (Inbox)", type: "text", group: "Kontak / SMTP", help: "Kosongkan untuk memakai Email perusahaan." },
  {
    key: "contact.smtp.servername",
    label: "Nama domain sertifikat TLS",
    type: "text",
    group: "Kontak / SMTP",
    help: "Wajib kalau SMTP Host diisi alamat IP — sertifikat dicek terhadap domain ini (mis. mail.arsipitaloka.id).",
  },

  {
    key: "newsletter.enabled",
    label: "Aktifkan newsletter",
    type: "boolean",
    group: "Newsletter",
    help: "Kalau mati, form subscribe dan pengiriman kabarnya berhenti.",
  },
  {
    key: "newsletter.fromName",
    label: "Nama pengirim",
    type: "text",
    group: "Newsletter",
    help: "Nama yang tampil di kotak masuk penerima.",
  },
  {
    key: "newsletter.sendWelcome",
    label: "Kirim email sambutan",
    type: "boolean",
    group: "Newsletter",
    help: "Dikirim sekali saat pelanggan baru berlangganan.",
  },

  {
    key: "order.email.enabled",
    label: "Kirim email notifikasi order",
    type: "boolean",
    group: "Order",
    help: "Kalau mati, pembeli tidak menerima email konfirmasi pembayaran.",
  },
  {
    key: "order.email.fromName",
    label: "Nama pengirim",
    type: "text",
    group: "Order",
    help: "Nama yang tampil di kotak masuk pembeli.",
  },

  {
    key: "auth.otp.expiryMinutes",
    label: "Masa berlaku OTP (menit)",
    type: "number",
    group: "Autentikasi",
    help: "Kode OTP reset password berhenti berlaku setelah jumlah ini.",
  },
  {
    key: "auth.otp.maxAttempts",
    label: "Batas percobaan OTP",
    type: "number",
    group: "Autentikasi",
    help: "Kalau kode salah sebanyak ini, pengguna harus meminta kode baru.",
  },

  { key: "tax.enabled", label: "Aktifkan pajak", type: "boolean", group: "Pajak" },
  { key: "tax.type", label: "Jenis pajak", type: "text", group: "Pajak", help: "percentage atau fixed" },
  { key: "tax.percentage", label: "Pajak persen", type: "text", group: "Pajak" },
  { key: "tax.fixedAmount", label: "Pajak tetap (Rp)", type: "text", group: "Pajak" },
];

export const SETTING_GROUPS = [
  "Profil",
  "Halaman Utama",
  "Media Sosial",
  "Footer",
  "Copy Landing Page",
  "Kontak / SMTP",
  "Newsletter",
  "Order",
  "Autentikasi",
  "Pajak",
];

/**
 * Baca semua pengaturan situs tanpa cache.
 *
 * Dipakai oleh `getSettings()` (versi cache) dan oleh skrip Node yang
 * berjalan di luar runtime Next — di sana `cacheTag()` tidak boleh dipanggil.
 */
export async function readSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const merged: Record<string, string> = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    const value = row.value?.trim() ? row.value : DEFAULT_SETTINGS[row.key] ?? "";
    merged[row.key] = value;
  }

  return merged;
}

/**
 * Baca semua pengaturan situs. Di-cache supaya landing page tidak query
 * DB tiap request; tag "content" di-invalidate dari server action admin.
 * Nilai kosong di DB otomatis memakai nilai bawaan.
 */
export async function getSettings(): Promise<Record<string, string>> {
  "use cache";
  cacheTag("content");

  return readSettings();
}

/**
 * Pembacaan pengaturan yang aman dipakai di mana saja: di dalam runtime Next
 * memakai versi cache, di luar itu (skrip Node) membaca langsung dari DB.
 */
export async function getSettingsSafe(): Promise<Record<string, string>> {
  if (process.env.NEXT_RUNTIME) {
    return getSettings();
  }
  return readSettings();
}
