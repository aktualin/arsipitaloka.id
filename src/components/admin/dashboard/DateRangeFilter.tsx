import Link from "next/link";
import { rangeLabel, type ReportRange } from "@/lib/admin/date-range";

/**
 * Filter rentang tanggal untuk laporan admin.
 *
 * Sengaja **server component** (tanpa "use client"): kontrolnya cuma link dan
 * form GET, jadi tidak perlu JavaScript — dan tidak perlu `useSearchParams`
 * yang akan memaksa seluruh halaman jadi dinamis.
 *
 * Query string:
 *   preset=12m|30d|90d|ytd  rentang siap pakai
 *   from=&to=               rentang bebas
 *   g=daily|monthly         granularitas pengelompokan
 */
const PRESETS: { key: "12m" | "30d" | "90d" | "ytd"; label: string; hint: string }[] = [
  { key: "12m", label: "12 Bulan", hint: "Ringkasan satu tahun terakhir, dikelompokkan per bulan" },
  { key: "30d", label: "30 Hari", hint: "30 hari terakhir, dikelompokkan per hari" },
  { key: "90d", label: "90 Hari", hint: "90 hari terakhir, dikelompokkan per hari" },
  { key: "ytd", label: "Tahun Ini", hint: "Sejak 1 Januari tahun berjalan, per bulan" },
];

function buildHref(
  basePath: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function DateRangeFilter({
  range,
  basePath,
  extraParams = {},
}: {
  range: ReportRange;
  basePath: string;
  /** Parameter lain yang harus ikut dibawa (mis. filter status). */
  extraParams?: Record<string, string | undefined>;
}) {
  const withExtra = (params: Record<string, string | undefined>) =>
    buildHref(basePath, { ...extraParams, ...params });

  const pillBase =
    "inline-flex min-h-9 items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition";

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-black">Periode Laporan</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {rangeLabel(range)} ·{" "}
            {range.granularity === "monthly"
              ? "dikelompokkan per bulan"
              : "dikelompokkan per hari"}
            {range.days > 0 ? ` · ${range.days} hari` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => {
            const active = range.preset === preset.key;
            return (
              <Link
                key={preset.key}
                href={withExtra({ preset: preset.key })}
                title={preset.hint}
                aria-current={active ? "true" : undefined}
                className={`${pillBase} ${
                  active
                    ? "border-maroon-dark bg-maroon-dark text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 border-t border-neutral-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <form method="get" action={basePath} className="flex flex-wrap items-end gap-3">
          {Object.entries(extraParams).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )}

          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Dari
            <input
              type="date"
              name="from"
              defaultValue={range.fromInput}
              max={range.toInput}
              className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-maroon"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Sampai
            <input
              type="date"
              name="to"
              defaultValue={range.toInput}
              min={range.fromInput}
              className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-maroon"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Pengelompokan
            <select
              name="g"
              defaultValue={range.granularity}
              className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-maroon"
            >
              <option value="daily">Harian</option>
              <option value="monthly">Bulanan</option>
            </select>
          </label>

          <button
            type="submit"
            className="min-h-9 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-700"
          >
            Terapkan
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Kelompokkan:</span>
          {(["daily", "monthly"] as const).map((option) => {
            const active = range.granularity === option;
            return (
              <Link
                key={option}
                href={withExtra({
                  from: range.fromInput,
                  to: range.toInput,
                  g: option,
                })}
                aria-current={active ? "true" : undefined}
                className={`${pillBase} ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {option === "daily" ? "Harian" : "Bulanan"}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
