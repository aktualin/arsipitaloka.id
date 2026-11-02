/**
 * Rentang tanggal & granularitas untuk laporan dashboard admin.
 *
 * Semua tanggal dihitung dalam zona waktu Indonesia (WIB, UTC+7, tanpa DST)
 * supaya "hari" dan "bulan" sama dengan yang dilihat admin di kalender.
 *
 * Query string yang dipakai:
 *   from=YYYY-MM-DD   tanggal mulai (inklusif)
 *   to=YYYY-MM-DD     tanggal selesai (inklusif)
 *   g=daily|monthly   granularitas pengelompokan
 *   preset=12m|30d|90d|ytd   rentang siap pakai (menimpa from/to)
 *
 * Nilai kosong → default: 12 bulan terakhir, dikelompokkan per bulan.
 */

export type Granularity = "daily" | "monthly";

export type PresetKey = "12m" | "30d" | "90d" | "ytd" | "custom";

export type ReportRange = {
  /** Mulai rentang (00:00:00.000 WIB hari pertama). */
  from: Date;
  /** Selesai rentang (23:59:59.999 WIB hari terakhir). */
  to: Date;
  /** Tanggal mulai dalam format input `YYYY-MM-DD`. */
  fromInput: string;
  /** Tanggal selesai dalam format input `YYYY-MM-DD`. */
  toInput: string;
  granularity: Granularity;
  preset: PresetKey;
  /** Jumlah hari dalam rentang (inklusif). */
  days: number;
};

const WIB = "+07:00";

/** Format tanggal tanpa zona waktu → kunci hari/bulan dalam WIB. */
function partsInWib(date: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(date).split("-").map(Number);
  return { year, month, day };
}

/** Kunci hari dalam WIB, mis. "2026-11-06". */
export function dayKey(date: Date): string {
  const { year, month, day } = partsInWib(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Kunci bulan dalam WIB, mis. "2026-11". */
export function monthKey(date: Date): string {
  const { year, month } = partsInWib(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

const WEEKDAY_CODES: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Jam (0–23) dalam WIB. */
export function hourInWib(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const raw = parts.find((part) => part.type === "hour")?.value ?? "0";
  return Number(raw) % 24;
}

/** Hari dalam minggu (0=Minggu … 6=Sabtu) dalam WIB. */
export function weekdayInWib(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).formatToParts(date);
  const raw = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  return WEEKDAY_CODES[raw] ?? 0;
}

/** Tanggal hari ini di WIB sebagai "YYYY-MM-DD". */
export function todayInput(): string {
  return dayKey(new Date());
}

/** Ubah "YYYY-MM-DD" jadi Date pada 00:00:00.000 WIB. */
export function startOfDayWib(input: string): Date {
  return new Date(`${input}T00:00:00.000${WIB}`);
}

/** Ubah "YYYY-MM-DD" jadi Date pada 23:59:59.999 WIB. */
export function endOfDayWib(input: string): Date {
  return new Date(`${input}T23:59:59.999${WIB}`);
}

function shiftMonths(base: Date, months: number): Date {
  const { year, month, day } = partsInWib(base);
  const target = new Date(Date.UTC(year, month - 1 + months, day));
  return new Date(
    `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}T00:00:00.000${WIB}`,
  );
}

function isValidInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00${WIB}`));
}

/** Rentang preset: 12 bulan, 30 hari, 90 hari, atau tahun berjalan. */
function presetRange(preset: Exclude<PresetKey, "custom">): {
  fromInput: string;
  toInput: string;
  granularity: Granularity;
} {
  const today = todayInput();
  const now = new Date(`${today}T00:00:00.000${WIB}`);

  switch (preset) {
    case "30d": {
      const from = new Date(now.getTime() - 29 * 86_400_000);
      return {
        fromInput: dayKey(from),
        toInput: today,
        granularity: "daily",
      };
    }
    case "90d": {
      const from = new Date(now.getTime() - 89 * 86_400_000);
      return {
        fromInput: dayKey(from),
        toInput: today,
        granularity: "daily",
      };
    }
    case "ytd": {
      return {
        fromInput: `${partsInWib(now).year}-01-01`,
        toInput: today,
        granularity: "monthly",
      };
    }
    case "12m":
    default: {
      // 12 bulan terakhir: mulai bulan yang sama tahun lalu.
      const start = shiftMonths(now, -11);
      return {
        fromInput: `${dayKey(start).slice(0, 7)}-01`,
        toInput: today,
        granularity: "monthly",
      };
    }
  }
}

function matchPreset(fromInput: string, toInput: string): PresetKey {
  for (const preset of ["12m", "30d", "90d", "ytd"] as const) {
    const range = presetRange(preset);
    if (range.fromInput === fromInput && range.toInput === toInput) return preset;
  }
  return "custom";
}

/**
 * Bangun rentang laporan dari query string.
 * Tanggal tidak valid / terbalik otomatis dikoreksi.
 */
export function resolveRange(params: {
  from?: string;
  to?: string;
  g?: string;
  preset?: string;
}): ReportRange {
  const rawFrom = params.from?.trim() ?? "";
  const rawTo = params.to?.trim() ?? "";
  const rawPreset = params.preset?.trim() ?? "";

  let fromInput = isValidInput(rawFrom) ? rawFrom : "";
  let toInput = isValidInput(rawTo) ? rawTo : "";
  let preset: PresetKey = "custom";
  let presetGranularity: Granularity | null = null;

  // Preset eksplisit menang atas from/to — dipakai tombol cepat di filter.
  if (isPresetKey(rawPreset)) {
    const range = presetRange(rawPreset);
    fromInput = range.fromInput;
    toInput = range.toInput;
    preset = rawPreset;
    presetGranularity = range.granularity;
  }

  if (!fromInput || !toInput) {
    const fallback = presetRange("12m");
    fromInput = fromInput || fallback.fromInput;
    toInput = toInput || fallback.toInput;
  }

  if (fromInput > toInput) {
    const tmp = fromInput;
    fromInput = toInput;
    toInput = tmp;
  }

  const from = startOfDayWib(fromInput);
  const to = endOfDayWib(toInput);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

  const requested = params.g?.trim();
  const granularity: Granularity =
    requested === "daily"
      ? "daily"
      : requested === "monthly"
        ? "monthly"
        : presetGranularity ?? (days <= 62 ? "daily" : "monthly");

  if (preset === "custom") preset = matchPreset(fromInput, toInput);

  return { from, to, fromInput, toInput, granularity, preset, days };
}

function isPresetKey(value: string): value is Exclude<PresetKey, "custom"> {
  return value === "12m" || value === "30d" || value === "90d" || value === "ytd";
}

/** Rentang periode sebelumnya dengan panjang yang sama (untuk pembanding). */
export function previousRange(range: ReportRange): { from: Date; to: Date } {
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span - 1), to: new Date(range.from.getTime() - 1) };
}

/** Kunci bucket ("2026-11" atau "2026-11-06") dalam urutan naik. */
export function bucketKeys(range: ReportRange): string[] {
  const keys: string[] = [];
  if (range.granularity === "monthly") {
    let cursor = new Date(`${range.fromInput.slice(0, 7)}-01T00:00:00.000${WIB}`);
    const last = range.toInput.slice(0, 7);
    while (true) {
      const key = monthKey(cursor);
      keys.push(key);
      if (key >= last) break;
      cursor = shiftMonths(cursor, 1);
    }
    return keys;
  }

  let cursor = startOfDayWib(range.fromInput);
  while (cursor.getTime() <= range.to.getTime()) {
    keys.push(dayKey(cursor));
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return keys;
}

/** Label bucket yang enak dibaca, mis. "Nov 2026" atau "6 Nov". */
export function bucketLabel(key: string, granularity: Granularity): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  if (granularity === "monthly") {
    return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  }
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

/** Label periode lengkap untuk judul laporan, mis. "1 Nov 2025 – 6 Nov 2026". */
export function rangeLabel(range: ReportRange): string {
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  return `${fmt.format(range.from)} – ${fmt.format(range.to)}`;
}
