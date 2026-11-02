/**
 * Format angka & tanggal untuk laporan dashboard admin.
 * Satu sumber supaya tabel, grafik, dan file unduhan konsisten.
 */

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatRupiah(value: number): string {
  return rupiahFormatter.format(Math.round(value || 0));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value || 0));
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(value || 0);
}

/** Bentuk ringkas untuk label sumbu: 1.200.000 → "1,2 jt". */
export function formatCompactRupiah(value: number): string {
  const abs = Math.abs(value || 0);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)} rb`;
  return `${sign}${Math.round(abs)}`;
}

export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value || 0);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(".", ",")} rb`;
  return `${sign}${Math.round(abs)}`;
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatDate(value: Date | string): string {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

/** Persentase perubahan antar periode, mis. "+12,4%". */
export function formatDelta(delta: number | null): string {
  if (delta === null || !Number.isFinite(delta)) return "—";
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${Math.abs(delta).toFixed(1).replace(".", ",")}%`;
}
