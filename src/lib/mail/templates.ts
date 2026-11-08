/**
 * Template email Arsip Pitaloka.
 *
 * Semua template memakai satu kerangka (lihat `theme.ts`) supaya tampilan
 * email konsisten dengan tema situs: maroon + kuning aksen.
 *
 * Setiap template mengembalikan `{ html, text }` — `text` dipakai sebagai
 * fallback untuk klien email yang tidak menampilkan HTML.
 */

import {
  MAIL_THEME,
  escapeHtml,
  htmlParagraphs,
  mailLayout,
  siteUrl,
} from "./theme";

export type MailContent = { html: string; text: string };

/** Format Rupiah untuk isi email (id-ID, tanpa desimal). */
function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}

/** Tanggal Indonesia (WIB) untuk isi email. */
function tanggal(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

/** Kartu konten baru (buku / berita / artikel / dokumentasi). */
export function contentAnnouncementMail(options: {
  eyebrow: string;
  title: string;
  excerpt?: string | null;
  url: string;
  ctaLabel?: string;
  coverUrl?: string | null;
  unsubscribeUrl?: string;
}): MailContent {
  const {
    eyebrow,
    title,
    excerpt,
    url,
    ctaLabel = "Baca selengkapnya",
    coverUrl,
    unsubscribeUrl,
  } = options;

  const coverHtml = coverUrl
    ? `<img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(title)}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:10px;margin:0 0 20px 0;" />`
    : "";

  const excerptHtml = excerpt
    ? `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${MAIL_THEME.body};">${escapeHtml(excerpt).replace(/\n/g, "<br />")}</p>`
    : "";

  const html = mailLayout({
    preheader: excerpt ? `${title} — ${excerpt}` : title,
    heading: title,
    bodyHtml: `
      <p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${MAIL_THEME.maroonSoft};">${escapeHtml(eyebrow)}</p>
      ${coverHtml}
      ${excerptHtml}
    `,
    cta: { label: ctaLabel, url },
    footerNote: "Ada konten baru untuk Anda",
    unsubscribeUrl,
  });

  const text = [
    eyebrow.toUpperCase(),
    "",
    title,
    "",
    excerpt ?? "",
    "",
    `${ctaLabel}: ${url}`,
    "",
    "Beranda: " + siteUrl("/"),
    "Katalog Buku: " + siteUrl("/buku"),
    unsubscribeUrl ? `Berhenti langganan: ${unsubscribeUrl}` : "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { html, text };
}

/** Pengumuman manual dari admin (tanpa konten spesifik). */
export function manualAnnouncementMail(options: {
  subject: string;
  body: string;
  url?: string | null;
  ctaLabel?: string;
  unsubscribeUrl?: string;
}): MailContent {
  const { subject, body, url, ctaLabel = "Lihat di situs", unsubscribeUrl } = options;

  const html = mailLayout({
    preheader: body.slice(0, 120),
    heading: subject,
    bodyHtml: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${MAIL_THEME.body};">${htmlParagraphs(body)}</div>`,
    cta: url ? { label: ctaLabel, url } : undefined,
    footerNote: "Pengumuman dari Arsip Pitaloka",
    unsubscribeUrl,
  });

  const text = [subject, "", body, "", url ? `${ctaLabel}: ${url}` : ""]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

/** OTP reset password — kode 6 angka, berlaku 5 menit. */
export function resetOtpMail(options: {
  code: string;
  minutes: number;
  name?: string | null;
}): MailContent {
  const { code, minutes, name } = options;

  const html = mailLayout({
    preheader: `Kode OTP reset password: ${code} (berlaku ${minutes} menit)`,
    heading: "Reset password",
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${MAIL_THEME.body};">
        ${name ? `Halo ${escapeHtml(name)},` : "Halo,"} kami menerima permintaan reset password untuk akun Arsip Pitaloka Anda.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;background-color:${MAIL_THEME.cream};border:1px solid ${MAIL_THEME.line};border-radius:12px;">
        <tr>
          <td align="center" style="padding:22px 34px;">
            <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${MAIL_THEME.body};">Kode OTP Anda</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:46px;font-weight:bold;letter-spacing:8px;color:${MAIL_THEME.maroon};">${escapeHtml(code)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:${MAIL_THEME.body};">
        Kode ini berlaku <strong style="color:${MAIL_THEME.ink};">${minutes} menit</strong> sejak dikirim, dan hanya bisa dipakai sekali.
      </p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:${MAIL_THEME.body};">
        Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai tim kami. Kalau bukan Anda yang meminta reset password, abaikan email ini — password Anda tidak berubah.
      </p>
    `,
    footerNote: "Arsip Pitaloka — keamanan akun",
  });

  const text = [
    "Reset password — Arsip Pitaloka",
    "",
    `Kode OTP: ${code}`,
    `Berlaku ${minutes} menit, hanya bisa dipakai sekali.`,
    "",
    "Kalau bukan Anda yang meminta, abaikan email ini.",
  ].join("\n");

  return { html, text };
}

/** Baris item buku di email konfirmasi order. */
export type OrderMailLine = {
  title: string;
  qty: number;
  /** Harga per item dalam Rupiah (sudah Termasuk qty). */
  amount: number;
};

/**
 * Konfirmasi order / pembayaran diterima.
 *
 * Dikirim sekali ketika order berubah jadi lunas. Isinya: nomor order,
 * status pembayaran, daftar buku, subtotal–pajak–total, dan tautan ke
 * halaman detail order di area pembeli.
 */
export function orderConfirmationMail(options: {
  orderNumber: string;
  buyerName?: string | null;
  lines: OrderMailLine[];
  /** Subtotal (IDR). */
  subtotal: number;
  /** Pajak (IDR). */
  taxAmount: number;
  /** Total yang ditagih (IDR). */
  total: number;
  /** Metode pembayaran, mis. "SNAP (midtrans)" atau "FREE". */
  paymentMethod: string;
  paidAt?: Date | string | null;
  /** URL absolut halaman detail order (/akun/orders/<id>). */
  orderUrl: string;
  /** True kalau order buku gratis (tanpa pembayaran). */
  isFree?: boolean;
}): MailContent {
  const {
    orderNumber,
    buyerName,
    lines,
    subtotal,
    taxAmount,
    total,
    paymentMethod,
    paidAt,
    orderUrl,
    isFree = false,
  } = options;

  const greeting = buyerName ? `Halo ${buyerName},` : "Halo,";
  const heading = isFree ? "Order Anda sudah selesai" : "Pembayaran diterima";
  const preheader = isFree
    ? `Order #${orderNumber} — buku Anda sudah tersedia di Pustaka Saya.`
    : `Order #${orderNumber} — pembayaran sudah kami terima, buku Anda siap dibaca.`;

  const linesHtml = lines
    .map(
      (line) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${MAIL_THEME.ink};">
          ${escapeHtml(line.title)}
        </td>
        <td align="center" style="padding:10px 6px;border-bottom:1px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${MAIL_THEME.body};">
          ${line.qty}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${MAIL_THEME.ink};">
          ${escapeHtml(rupiah(line.amount))}
        </td>
      </tr>`,
    )
    .join("");

  const taxRow =
    taxAmount > 0
      ? `
      <tr>
        <td colspan="2" style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${MAIL_THEME.body};">Pajak</td>
        <td align="right" style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${MAIL_THEME.body};">${escapeHtml(rupiah(taxAmount))}</td>
      </tr>`
      : "";

  const html = mailLayout({
    preheader,
    heading,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${MAIL_THEME.body};">
        ${greeting} ${
          isFree
            ? "buku yang Anda klaim sudah tersedia di Pustaka Saya. Tidak ada pembayaran yang perlu dilakukan."
            : "terima kasih. Pembayaran Anda sudah kami terima dan buku Anda sekarang bisa dibaca."
        }
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px 0;background-color:${MAIL_THEME.cream};border:1px solid ${MAIL_THEME.line};border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MAIL_THEME.body};">Nomor order</td>
                <td align="right" style="padding:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${MAIL_THEME.maroon};">#${escapeHtml(orderNumber)}</td>
              </tr>
              <tr>
                <td style="padding:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MAIL_THEME.body};">Status pembayaran</td>
                <td align="right" style="padding:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${MAIL_THEME.ink};">${isFree ? "Selesai (gratis)" : "Lunas"}</td>
              </tr>
              <tr>
                <td style="padding:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MAIL_THEME.body};">Metode pembayaran</td>
                <td align="right" style="padding:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MAIL_THEME.ink};">${escapeHtml(paymentMethod)}</td>
              </tr>
              <tr>
                <td style="padding:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MAIL_THEME.body};">Tanggal</td>
                <td align="right" style="padding:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MAIL_THEME.ink};">${escapeHtml(tanggal(paidAt))}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 18px 0;">
        <tr>
          <td align="left" style="padding:0 0 8px 0;border-bottom:2px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MAIL_THEME.body};">Judul</td>
          <td align="center" width="60" style="padding:0 0 8px 0;border-bottom:2px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MAIL_THEME.body};">Qty</td>
          <td align="right" style="padding:0 0 8px 0;border-bottom:2px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MAIL_THEME.body};">Harga</td>
        </tr>
        ${linesHtml}
        <tr>
          <td colspan="2" style="padding:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${MAIL_THEME.body};">Subtotal</td>
          <td align="right" style="padding:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:${MAIL_THEME.ink};">${escapeHtml(rupiah(subtotal))}</td>
        </tr>
        ${taxRow}
        <tr>
          <td colspan="2" style="padding:8px 0 0 0;border-top:1px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${MAIL_THEME.ink};">Total</td>
          <td align="right" style="padding:8px 0 0 0;border-top:1px solid ${MAIL_THEME.line};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:${MAIL_THEME.maroon};">${escapeHtml(rupiah(total))}</td>
        </tr>
      </table>

      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:${MAIL_THEME.body};">
        Buku Anda sudah tersedia di Pustaka Saya. Buka detail order di bawah untuk melihat daftar buku dan mengunduh e-book yang Anda beli.
      </p>
    `,
    cta: { label: "Lihat detail order", url: orderUrl },
    footerNote: "Arsip Pitaloka — konfirmasi pembelian",
  });

  const text = [
    heading + " — Arsip Pitaloka",
    "",
    `${greeting} ${
      isFree
        ? "buku yang Anda klaim sudah tersedia di Pustaka Saya."
        : "terima kasih. Pembayaran Anda sudah kami terima dan buku Anda sekarang bisa dibaca."
    }`,
    "",
    `Nomor order: #${orderNumber}`,
    `Status pembayaran: ${isFree ? "Selesai (gratis)" : "Lunas"}`,
    `Metode pembayaran: ${paymentMethod}`,
    `Tanggal: ${tanggal(paidAt)}`,
    "",
    ...lines.map((line) => `- ${line.title} x${line.qty}: ${rupiah(line.amount)}`),
    "",
    `Subtotal: ${rupiah(subtotal)}`,
    ...(taxAmount > 0 ? [`Pajak: ${rupiah(taxAmount)}`] : []),
    `Total: ${rupiah(total)}`,
    "",
    "Lihat detail order: " + orderUrl,
    "Pustaka Saya: " + siteUrl("/akun"),
  ].join("\n");

  return { html, text };
}

/** Email sambutan untuk pelanggan baru (selamat datang). */
export function welcomeMail(options: {
  name?: string | null;
  unsubscribeUrl?: string;
}): MailContent {
  const { name, unsubscribeUrl } = options;
  const greeting = name ? `Halo ${name},` : "Halo,";

  const html = mailLayout({
    preheader: "Selamat datang di Arsip Pitaloka — akun Anda sudah aktif.",
    heading: "Selamat datang di Arsip Pitaloka",
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${MAIL_THEME.body};">${greeting} akun Anda sudah aktif. Sekarang Anda bisa:</p>
      <ul style="margin:0 0 16px 0;padding:0 0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:${MAIL_THEME.body};">
        <li>menjelajah koleksi e-book di katalog Pitaloka,</li>
        <li>menyimpan buku yang sudah dibeli di Pustaka Saya,</li>
        <li>menerima kabar terbaru tentang buku, berita, dan dokumentasi baru.</li>
      </ul>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:${MAIL_THEME.body};">
        Pustaka digital &amp; e-book karya Rieke Diah Pitaloka — disimpan dan lestarkan untuk semua.
      </p>
    `,
    cta: { label: "Jelajahi katalog", url: siteUrl("/buku") },
    footerNote: "Arsip Pitaloka",
    unsubscribeUrl,
  });

  const text = [
    "Selamat datang di Arsip Pitaloka",
    "",
    `${greeting} akun Anda sudah aktif.`,
    "",
    "Jelajahi katalog: " + siteUrl("/buku"),
    "Pustaka Saya: " + siteUrl("/akun"),
  ].join("\n");

  return { html, text };
}
