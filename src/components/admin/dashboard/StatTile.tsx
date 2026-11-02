import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatDelta } from "@/lib/admin/report-format";
import { STATUS_CRITICAL, STATUS_GOOD } from "./palette";

/**
 * Kartu statistik: satu angka utama + perbandingan dengan periode
 * sebelumnya. Warna status selalu berpasangan dengan ikon dan label teks,
 * jadi tidak pernah hanya mengandalkan warna.
 */
export default function StatTile({
  label,
  value,
  delta,
  deltaLabel = "vs periode sebelumnya",
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = hasDelta && (delta as number) > 0;
  const flat = hasDelta && (delta as number) === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const color = flat ? "#898781" : up ? STATUS_GOOD : STATUS_CRITICAL;

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="font-heading mt-2 text-2xl font-bold tabular-nums text-black sm:text-3xl">
        {value}
      </p>
      {hasDelta ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600">
          <Icon size={14} style={{ color }} aria-hidden="true" />
          <span style={{ color }} className="font-semibold tabular-nums">
            {formatDelta(delta as number)}
          </span>
          <span className="text-neutral-400">{deltaLabel}</span>
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}
