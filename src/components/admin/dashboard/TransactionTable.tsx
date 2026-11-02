import Link from "next/link";
import { formatDateTime, formatNumber, formatRupiah } from "@/lib/admin/report-format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ORDER,
  type OrderStatusKey,
  type TransactionRow,
} from "@/lib/admin/stats";
import type { ReportRange } from "@/lib/admin/date-range";
import Pagination from "@/components/Pagination";

/**
 * Tabel rinci transaksi di dashboard admin.
 *
 * Paginasi & filter-nya dihitung di server — komponen ini hanya
 * menampilkan baris yang sudah diambil (`rows`) dan form filter-nya
 * meneruskan query string yang sama ke `Pagination` supaya tidak hilang
 * saat pindah halaman.
 */

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-neutral-200 text-neutral-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const COLUMNS = [
  "Tanggal",
  "ID Order",
  "Pembeli",
  "Status",
  "Pembayaran",
  "Produk",
  "Item",
  "Subtotal",
  "Pajak",
  "Total",
];

export default function TransactionTable({
  range,
  rows,
  total,
  page,
  perPage,
  status,
  q,
}: {
  range: ReportRange;
  rows: TransactionRow[];
  total: number;
  page: number;
  perPage: number;
  status?: OrderStatusKey;
  q?: string;
}) {
  const params: Record<string, string | undefined> = {
    from: range.fromInput,
    to: range.toInput,
    g: range.granularity,
    status,
    q,
  };

  return (
    <section
      id="transaksi"
      className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-bold text-black">
            Rincian Transaksi
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {formatNumber(total)} transaksi pada rentang &amp; filter ini.
          </p>
        </div>
      </div>

      <form
        method="get"
        action="/admin"
        className="mt-4 flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="from" value={range.fromInput} />
        <input type="hidden" name="to" value={range.toInput} />
        <input type="hidden" name="g" value={range.granularity} />

        <select
          name="status"
          defaultValue={status ?? ""}
          className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-maroon"
        >
          <option value="">Semua status</option>
          {ORDER_STATUS_ORDER.map((key) => (
            <option key={key} value={key}>
              {ORDER_STATUS_LABELS[key]}
            </option>
          ))}
        </select>

        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari nama, email, ID, atau judul buku"
          className="min-h-9 min-w-[240px] flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:border-maroon"
        />

        <button
          type="submit"
          className="min-h-9 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-700"
        >
          Terapkan
        </button>

        {status || q ? (
          <Link
            href={`/admin?from=${range.fromInput}&to=${range.toInput}&g=${range.granularity}`}
            className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
          >
            Reset filter
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">
          Belum ada transaksi pada rentang dan filter ini.
        </p>
      ) : (
        <div className="mt-4 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[1080px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                {COLUMNS.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={`border-b border-neutral-200 py-2 pr-3 font-medium ${
                      index >= 6 ? "text-right" : "text-left"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  <td className="whitespace-nowrap py-2 pr-3 text-neutral-700">
                    {formatDateTime(row.date)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-neutral-500">
                    {row.id.slice(-10)}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="block text-neutral-800">{row.customer}</span>
                    <span className="block text-[10px] text-neutral-500">{row.email}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        STATUS_STYLE[row.status] ?? "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-neutral-700">
                    {row.paymentMethod}
                    <span className="block text-[10px] text-neutral-500">
                      {row.deliveryMethod}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {row.items.length === 0 ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      row.items.map((item) => (
                        <span key={item.title} className="block text-neutral-700">
                          {item.title}{" "}
                          <span className="text-neutral-500">×{item.qty}</span>
                        </span>
                      ))
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatNumber(row.itemCount)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatRupiah(row.subtotal)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatRupiah(row.tax)}
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-black">
                    {formatRupiah(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-neutral-100 pt-4">
        <Pagination
          basePath="/admin"
          page={page}
          perPage={perPage}
          total={total}
          params={params}
          label="transaksi"
        />
      </div>
    </section>
  );
}
