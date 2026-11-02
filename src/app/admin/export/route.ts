import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { resolveRange } from "@/lib/admin/date-range";
import { exportFileName, toCsv, toXlsx } from "@/lib/admin/export";
import { buildSheets } from "@/lib/admin/report-sheets";
import {
  getDashboardStats,
  getFilteredOrders,
  toTransactionRows,
  ORDER_STATUS_ORDER,
  type OrderStatusKey,
} from "@/lib/admin/stats";

/**
 * Unduh laporan admin (Excel / CSV).
 *
 * Route: `GET /admin/export?report=&format=&from=&to=&g=&status=&q=`
 *
 * `report` menentukan isi: `transactions`, `stats`, `products`, `customers`,
 * `content`, atau `all` (default). `format` = `xlsx` (default) atau `csv`.
 *
 * Filter `status` & `q` memakai klausa WHERE yang sama dengan tabel
 * transaksi (`buildOrderWhere`) — jadi file unduhan persis sama dengan
 * yang tampil di layar.
 *
 * CSV hanya bisa memuat satu tabel, jadi untuk format CSV sheet pertama yang
 * relevan dipakai — untuk laporan yang punya beberapa sheet, pemanggil
 * sebaiknya meminta report yang spesifik.
 */

const REPORT_NAMES: Record<string, string> = {
  transactions: "transaksi",
  stats: "statistik",
  products: "penjualan-produk",
  customers: "pelanggan",
  content: "konten",
  all: "laporan",
};

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const report = url.searchParams.get("report") ?? "all";
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const range = resolveRange({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    g: url.searchParams.get("g") ?? undefined,
    preset: url.searchParams.get("preset") ?? undefined,
  });

  // Filter yang sama dengan tabel transaksi.
  const rawStatus = url.searchParams.get("status") ?? "";
  const statusFilter = ORDER_STATUS_ORDER.includes(rawStatus as OrderStatusKey)
    ? (rawStatus as OrderStatusKey)
    : undefined;
  const query = url.searchParams.get("q")?.trim() || undefined;

  const [stats, orders] = await Promise.all([
    getDashboardStats(range),
    getFilteredOrders(range, {
      status: statusFilter,
      q: query,
    }),
  ]);

  const transactions = toTransactionRows(orders);
  const sheets = buildSheets(report, stats, transactions);

  // Untuk CSV, hanya satu tabel yang bisa ditulis. Pilih sheet yang paling
  // mewakili laporan yang diminta.
  const csvSheet =
    report === "transactions"
      ? sheets[0]
      : report === "stats"
        ? sheets[0]
        : report === "products" || report === "customers" || report === "content"
          ? sheets[0]
          : sheets[1] ?? sheets[0];

  const baseName = REPORT_NAMES[report] ?? "laporan";
  const stamp = range.toInput;

  if (format === "csv") {
    const csv = toCsv([csvSheet]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName(baseName, "csv", stamp)}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const xlsx = toXlsx(sheets);
  return new Response(Buffer.from(xlsx), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(baseName, "xlsx", stamp)}"`,
      "Cache-Control": "no-store",
    },
  });
}
