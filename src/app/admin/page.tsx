import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/require-admin";
import { resolveRange } from "@/lib/admin/date-range";
import {
  buildOrderWhere,
  mapOrderRow,
  toTransactionRows,
  ORDER_ROW_SELECT,
  ORDER_STATUS_ORDER,
  PAID_STATUSES,
  getDashboardStats,
  type OrderStatusKey,
} from "@/lib/admin/stats";
import { formatNumber, formatRupiah } from "@/lib/admin/report-format";
import { clampPage, parsePage, parsePerPage } from "@/lib/pagination";
import StatTile from "@/components/admin/dashboard/StatTile";
import DateRangeFilter from "@/components/admin/dashboard/DateRangeFilter";
import ExportButtons from "@/components/admin/dashboard/ExportButtons";
import SectionNav from "@/components/admin/dashboard/SectionNav";
import DashboardCharts from "@/components/admin/dashboard/DashboardCharts";
import DashboardTables from "@/components/admin/dashboard/DashboardTables";
import TransactionTable from "@/components/admin/dashboard/TransactionTable";
import PageLoader from "@/components/PageLoader";

export const metadata = {
  title: "Dashboard — Arsip Pitaloka",
};

/**
 * Dashboard admin: KPI, tren, komposisi, dan rincian transaksi dalam satu
 * halaman.
 *
 * Seluruh agregasi dihitung di server (`getDashboardStats`) — halaman hanya
 * menerima angka yang sudah diringkas, jadi browser tidak pernah menarik
 * ribuan baris order.
 *
 * Query string:
 *   from / to / g / preset  rentang & granularitas (lihat `date-range.ts`)
 *   status / q / page / per filter & paginasi tabel transaksi
 */
export default function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    g?: string;
    preset?: string;
    status?: string;
    q?: string;
    page?: string;
    per?: string;
  }>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminDashboardContent({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    g?: string;
    preset?: string;
    status?: string;
    q?: string;
    page?: string;
    per?: string;
  }>;
}) {
  await connection();

  const admin = await requireAdmin();
  if (!admin) return null;

  const sp = await searchParams;
  const range = resolveRange({
    from: sp.from,
    to: sp.to,
    g: sp.g,
    preset: sp.preset,
  });

  // Filter tabel transaksi — klausa WHERE-nya sama dengan yang dipakai
  // route ekspor, jadi file unduhan persis sama dengan tabel.
  const status = ORDER_STATUS_ORDER.includes(sp.status as OrderStatusKey)
    ? (sp.status as OrderStatusKey)
    : undefined;
  const q = sp.q?.trim();
  const where = buildOrderWhere(range, { status, q });

  const perPage = parsePerPage(sp.per);
  const [stats, total] = await Promise.all([
    getDashboardStats(range),
    prisma.order.count({ where }),
  ]);
  const page = clampPage(parsePage(sp.page), total, perPage);

  const [rawRows, revenueAgg] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: ORDER_ROW_SELECT,
    }),
    prisma.order.aggregate({
      where: { ...where, status: { in: [...PAID_STATUSES] } },
      _sum: { total: true },
    }),
  ]);

  const rows = toTransactionRows(
    rawRows.map((row) => mapOrderRow({ ...row, status: row.status as OrderStatusKey })),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-black sm:text-2xl">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-500">
            Ringkasan transaksi &amp; konten. Halo, {admin.name}.
          </p>
        </div>
        <ExportButtons
          range={range}
          report="all"
          label="Unduh laporan"
          extraParams={{ status, q }}
        />
      </header>

      <DateRangeFilter range={range} basePath="/admin" />

      <SectionNav />

      {/* --- Ringkasan ---------------------------------------------------- */}
      <section id="ringkasan" className="scroll-mt-20 space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label="Pendapatan"
            value={formatRupiah(stats.kpi.revenue.value)}
            delta={stats.kpi.revenue.delta}
          />
          <StatTile
            label="Order"
            value={formatNumber(stats.kpi.orders.value)}
            delta={stats.kpi.orders.delta}
          />
          <StatTile
            label="Rata-rata Order"
            value={formatRupiah(stats.kpi.aov.value)}
            delta={stats.kpi.aov.delta}
          />
          <StatTile
            label="Item Terjual"
            value={formatNumber(stats.kpi.itemsSold.value)}
            delta={stats.kpi.itemsSold.delta}
          />
          <StatTile
            label="Pengguna Baru"
            value={formatNumber(stats.kpi.newUsers.value)}
            delta={stats.kpi.newUsers.delta}
          />
          <StatTile
            label="Belum Bayar"
            value={formatNumber(stats.kpi.pending.count)}
            hint={`${formatRupiah(stats.kpi.pending.amount)} menunggu pembayaran`}
          />
        </div>
      </section>

      {/* --- Grafik -------------------------------------------------------- */}
      <section id="grafik" className="scroll-mt-20 space-y-4">
        <DashboardCharts stats={stats} />
      </section>

      {/* --- Produk & pelanggan ------------------------------------------- */}
      <section id="produk" className="scroll-mt-20 space-y-4">
        <DashboardTables stats={stats} />
      </section>

      {/* --- Transaksi ----------------------------------------------------- */}
      <TransactionTable
        range={range}
        rows={rows}
        total={total}
        page={page}
        perPage={perPage}
        status={status}
        q={q}
      />
    </div>
  );
}
