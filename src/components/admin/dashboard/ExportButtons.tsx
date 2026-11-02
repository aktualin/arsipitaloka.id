import { FileSpreadsheet, FileText } from "lucide-react";
import type { ReportRange } from "@/lib/admin/date-range";

/**
 * Tombol unduh laporan (Excel & CSV).
 *
 * Link biasa menuju route export — bukan fetch/blobs — supaya unduhan
 * ditangani browser dan nama file tetap mengikuti `Content-Disposition`.
 */
export default function ExportButtons({
  range,
  report = "transactions",
  basePath = "/admin/export",
  label = "Unduh",
  extraParams = {},
}: {
  range: ReportRange;
  /** Laporan yang diunduh — menentukan sheet mana yang dibuat. */
  report?: string;
  basePath?: string;
  label?: string;
  /** Filter tambahan yang ikut diterapkan ke file unduhan (mis. status/pencarian). */
  extraParams?: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams({
    report,
    from: range.fromInput,
    to: range.toInput,
    g: range.granularity,
  });

  for (const [key, value] of Object.entries(extraParams)) {
    if (value) params.set(key, value);
  }

  const linkClass =
    "inline-flex min-h-9 items-center gap-2 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">{label}:</span>
      <a
        href={`${basePath}?${params.toString()}&format=xlsx`}
        className={linkClass}
        title="Unduh sebagai Microsoft Excel (.xlsx)"
      >
        <FileSpreadsheet size={14} aria-hidden="true" />
        Excel
      </a>
      <a
        href={`${basePath}?${params.toString()}&format=csv`}
        className={linkClass}
        title="Unduh sebagai CSV (dibuka di Excel)"
      >
        <FileText size={14} aria-hidden="true" />
        CSV
      </a>
    </div>
  );
}
