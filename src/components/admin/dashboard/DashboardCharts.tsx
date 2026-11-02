import { formatNumber, formatRupiah } from "@/lib/admin/report-format";
import type { DashboardStats } from "@/lib/admin/stats";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import {
  BarChart,
  DoughnutChart,
  LineChart,
  COLOR_COUNT,
  COLOR_MONEY,
  COLOR_RATE,
} from "@/components/admin/dashboard/charts";

/**
 * Kumpulan grafik dashboard admin.
 *
 * Semua grafik punya pasangan tabel (tombol "Tabel" di tiap `ChartCard`) —
 * relieving wajib untuk grafik yang kontrasnya di bawah 3:1, dan supaya data
 * bisa dibaca tanpa hover maupun oleh pembaca layar.
 *
 * Warna mengikuti palet di `palette.ts`: slot 1 = nilai uang, slot 2 =
 * jumlah, slot 3 = rata-rata/rasio. Urutannya tidak boleh diacak.
 */
export default function DashboardCharts({ stats }: { stats: DashboardStats }) {
  const labels = stats.periods.map((period) => period.label);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Pendapatan per Periode"
        subtitle="Hanya order berstatus lunas (lunas, dikirim, selesai)."
        table={periodTable(stats, "revenue")}
        height={300}
      >
        <BarChart
          labels={labels}
          series={[
            {
              label: "Pendapatan",
              data: stats.periods.map((period) => period.revenue),
              color: COLOR_MONEY,
            },
          ]}
          money
        />
      </ChartCard>

      <ChartCard
        title="Akumulasi Pendapatan"
        subtitle="Total kumulatif sejak awal periode terpilih."
        table={periodTable(stats, "cumulativeRevenue")}
        height={300}
      >
        <LineChart
          labels={labels}
          series={[
            {
              label: "Akumulasi",
              data: stats.periods.map((period) => period.cumulativeRevenue),
              color: COLOR_MONEY,
            },
          ]}
          money
          area
        />
      </ChartCard>

      <ChartCard
        title="Jumlah Order"
        subtitle="Semua order, termasuk yang belum dibayar."
        table={periodTable(stats, "orders")}
        height={280}
      >
        <BarChart
          labels={labels}
          series={[
            {
              label: "Order",
              data: stats.periods.map((period) => period.orders),
              color: COLOR_COUNT,
            },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Rata-rata Nilai Order"
        subtitle="Pendapatan dibagi order lunas pada tiap periode."
        table={periodTable(stats, "aov")}
        height={280}
      >
        <LineChart
          labels={labels}
          series={[
            {
              label: "Rata-rata",
              data: stats.periods.map((period) => Math.round(period.aov)),
              color: COLOR_RATE,
            },
          ]}
          money
        />
      </ChartCard>

      <ChartCard
        title="Item Terjual per Periode"
        subtitle="Jumlah eksemplar e-book terjual tiap periode."
        table={periodTable(stats, "items")}
        height={280}
      >
        <BarChart
          labels={labels}
          series={[
            {
              label: "Item terjual",
              data: stats.periods.map((period) => period.items),
              color: COLOR_COUNT,
            },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Pengguna Baru"
        subtitle="Akun yang dibuat pada tiap periode."
        table={periodTable(stats, "newUsers")}
        height={280}
      >
        <LineChart
          labels={labels}
          series={[
            {
              label: "Pengguna baru",
              data: stats.periods.map((period) => period.newUsers),
              color: COLOR_RATE,
            },
          ]}
          area
        />
      </ChartCard>

      <ChartCard
        title="Status Order"
        subtitle="Sebaran status seluruh order pada periode ini."
        table={{
          columns: ["Status", "Jumlah", "Nilai"],
          rows: stats.statusBreakdown.map((row) => [
            row.label,
            formatNumber(row.count),
            formatRupiah(row.amount),
          ]),
        }}
        height={280}
      >
        <DoughnutChart
          labels={stats.statusBreakdown.map((row) => row.label)}
          values={stats.statusBreakdown.map((row) => row.count)}
        />
      </ChartCard>

      <ChartCard
        title="Metode Pembayaran"
        subtitle="Jumlah order per metode pembayaran."
        table={{
          columns: ["Metode", "Jumlah", "Nilai"],
          rows: stats.paymentBreakdown.map((row) => [
            row.label,
            formatNumber(row.count),
            formatRupiah(row.amount),
          ]),
        }}
        height={280}
      >
        <BarChart
          labels={stats.paymentBreakdown.map((row) => row.label)}
          series={[
            {
              label: "Order",
              data: stats.paymentBreakdown.map((row) => row.count),
              color: COLOR_COUNT,
            },
          ]}
          horizontal
        />
      </ChartCard>

      <ChartCard
        title="Metode Pengiriman"
        subtitle="Unduh digital dibanding kirim fisik."
        table={{
          columns: ["Metode", "Jumlah", "Nilai"],
          rows: stats.deliveryBreakdown.map((row) => [
            row.label,
            formatNumber(row.count),
            formatRupiah(row.amount),
          ]),
        }}
        height={280}
      >
        <DoughnutChart
          labels={stats.deliveryBreakdown.map((row) => row.label)}
          values={stats.deliveryBreakdown.map((row) => row.count)}
        />
      </ChartCard>

      <ChartCard
        title="Penyedia Pembayaran"
        subtitle="Midtrans, gratis, atau pembayaran manual."
        table={{
          columns: ["Penyedia", "Jumlah", "Nilai"],
          rows: stats.providerBreakdown.map((row) => [
            row.label,
            formatNumber(row.count),
            formatRupiah(row.amount),
          ]),
        }}
        height={280}
      >
        <DoughnutChart
          labels={stats.providerBreakdown.map((row) => row.label)}
          values={stats.providerBreakdown.map((row) => row.count)}
        />
      </ChartCard>

      <ChartCard
        title="Order per Jam (WIB)"
        subtitle="Kapan pembeli paling sering bertransaksi."
        table={{
          columns: ["Jam", "Order", "Pendapatan"],
          rows: stats.ordersByHour.map((row) => [
            row.label,
            formatNumber(row.orders),
            formatRupiah(row.revenue),
          ]),
        }}
        height={280}
      >
        <BarChart
          labels={stats.ordersByHour.map((row) => row.label)}
          series={[
            {
              label: "Order",
              data: stats.ordersByHour.map((row) => row.orders),
              color: COLOR_COUNT,
            },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Order per Hari dalam Minggu"
        subtitle="Distribusi pembelian sepanjang minggu."
        table={{
          columns: ["Hari", "Order", "Pendapatan"],
          rows: stats.ordersByWeekday.map((row) => [
            row.label,
            formatNumber(row.orders),
            formatRupiah(row.revenue),
          ]),
        }}
        height={280}
      >
        <BarChart
          labels={stats.ordersByWeekday.map((row) => row.label)}
          series={[
            {
              label: "Order",
              data: stats.ordersByWeekday.map((row) => row.orders),
              color: COLOR_RATE,
            },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="10 Buku Terlaris — Pendapatan"
        subtitle="Berdasarkan total pendapatan pada periode ini."
        table={{
          columns: ["Judul", "Terjual", "Pendapatan"],
          rows: stats.topBooksByRevenue.map((book) => [
            book.title,
            formatNumber(book.qty),
            formatRupiah(book.revenue),
          ]),
        }}
        height={320}
      >
        <BarChart
          labels={stats.topBooksByRevenue.map((book) => book.title)}
          series={[
            {
              label: "Pendapatan",
              data: stats.topBooksByRevenue.map((book) => Math.round(book.revenue)),
              color: COLOR_MONEY,
            },
          ]}
          money
          horizontal
        />
      </ChartCard>

      <ChartCard
        title="10 Buku Terlaris — Jumlah"
        subtitle="Berdasarkan jumlah eksemplar terjual."
        table={{
          columns: ["Judul", "Terjual", "Pendapatan"],
          rows: stats.topBooksByQty.map((book) => [
            book.title,
            formatNumber(book.qty),
            formatRupiah(book.revenue),
          ]),
        }}
        height={320}
      >
        <BarChart
          labels={stats.topBooksByQty.map((book) => book.title)}
          series={[
            {
              label: "Terjual",
              data: stats.topBooksByQty.map((book) => book.qty),
              color: COLOR_COUNT,
            },
          ]}
          horizontal
        />
      </ChartCard>

      <ChartCard
        title="Penjualan per Kategori"
        subtitle="Pendapatan tiap kategori buku."
        table={{
          columns: ["Kategori", "Terjual", "Pendapatan"],
          rows: stats.byCategory.map((category) => [
            category.name,
            formatNumber(category.qty),
            formatRupiah(category.revenue),
          ]),
        }}
        height={280}
      >
        <BarChart
          labels={stats.byCategory.map((category) => category.name)}
          series={[
            {
              label: "Pendapatan",
              data: stats.byCategory.map((category) => Math.round(category.revenue)),
              color: COLOR_MONEY,
            },
          ]}
          money
        />
      </ChartCard>

      <ChartCard
        title="10 Pelanggan Teratas"
        subtitle="Berdasarkan total belanja (order lunas saja)."
        table={{
          columns: ["Pelanggan", "Order", "Belanja"],
          rows: stats.topCustomers.map((customer) => [
            customer.name,
            formatNumber(customer.orders),
            formatRupiah(customer.revenue),
          ]),
        }}
        height={320}
      >
        <BarChart
          labels={stats.topCustomers.map((customer) => customer.name)}
          series={[
            {
              label: "Belanja",
              data: stats.topCustomers.map((customer) => Math.round(customer.revenue)),
              color: COLOR_MONEY,
            },
          ]}
          money
          horizontal
        />
      </ChartCard>

      <ChartCard
        title="10 Pelanggan Teratas — Jumlah Order"
        subtitle="Pelanggan dengan order terbanyak pada periode ini."
        table={{
          columns: ["Pelanggan", "Order", "Belanja"],
          rows: stats.topCustomersByOrders.map((customer) => [
            customer.name,
            formatNumber(customer.orders),
            formatRupiah(customer.revenue),
          ]),
        }}
        height={320}
      >
        <BarChart
          labels={stats.topCustomersByOrders.map((customer) => customer.name)}
          series={[
            {
              label: "Order",
              data: stats.topCustomersByOrders.map((customer) => customer.orders),
              color: COLOR_COUNT,
            },
          ]}
          horizontal
        />
      </ChartCard>

      <ChartCard
        title="Persediaan Konten"
        subtitle="Jumlah konten yang tersedia saat ini, per jenis."
        table={{
          columns: ["Jenis", "Jumlah"],
          rows: contentInventory(stats).map((row) => [
            row.label,
            formatNumber(row.value),
          ]),
        }}
        height={280}
      >
        <BarChart
          labels={contentInventory(stats).map((row) => row.label)}
          series={[
            {
              label: "Jumlah",
              data: contentInventory(stats).map((row) => row.value),
              color: COLOR_COUNT,
            },
          ]}
          horizontal
        />
      </ChartCard>

      <ChartCard
        title="Konten Terbit per Periode"
        subtitle="Jumlah artikel baru per jenis konten."
        table={{
          columns: ["Periode", ...stats.articlesByPeriod.datasets.map((d) => d.label)],
          rows: stats.periods.map((period, index) => [
            period.label,
            ...stats.articlesByPeriod.datasets.map((dataset) =>
              formatNumber(dataset.values[index] ?? 0),
            ),
          ]),
        }}
        height={280}
      >
        <BarChart
          labels={labels}
          series={stats.articlesByPeriod.datasets.map((dataset) => ({
            label: dataset.label,
            data: dataset.values,
          }))}
          stacked
          legend={stats.articlesByPeriod.datasets.length > 1}
        />
      </ChartCard>

      <ChartCard
        title="Produk Gratis vs Berbayar"
        subtitle="Jumlah eksemplar terjual per jenis produk."
        table={{
          columns: ["Jenis", "Terjual"],
          rows: [
            ["Gratis", formatNumber(stats.freeVsPaid.freeQty)],
            ["Berbayar", formatNumber(stats.freeVsPaid.paidQty)],
          ],
        }}
        height={280}
      >
        <DoughnutChart
          labels={["Gratis", "Berbayar"]}
          values={[stats.freeVsPaid.freeQty, stats.freeVsPaid.paidQty]}
        />
      </ChartCard>
    </div>
  );
}

/** Persediaan konten saat ini, per jenis — untuk grafik "Persediaan Konten". */
function contentInventory(stats: DashboardStats) {
  const articleCount = stats.content.articles.reduce(
    (sum, article) => sum + article.count,
    0,
  );

  return [
    { label: "E-Book", value: stats.content.books },
    { label: "Artikel", value: articleCount },
    { label: "Dokumentasi", value: stats.content.documentation },
    { label: "Video YouTube", value: stats.content.videos },
    { label: "Video TikTok", value: stats.content.tiktok },
  ];
}

/** Tabel periodik untuk tombol "Tabel" di tiap kartu grafik. */
function periodTable(
  stats: DashboardStats,
  metric:
    | "revenue"
    | "orders"
    | "aov"
    | "cumulativeRevenue"
    | "newUsers"
    | "items",
): { columns: string[]; rows: (string | number)[][] } {
  const labels: Record<typeof metric, string> = {
    revenue: "Pendapatan",
    orders: "Order",
    aov: "Rata-rata",
    cumulativeRevenue: "Akumulasi",
    newUsers: "Pengguna Baru",
    items: "Item Terjual",
  };

  const isMoney = metric !== "orders" && metric !== "newUsers" && metric !== "items";

  return {
    columns: ["Periode", labels[metric]],
    rows: stats.periods.map((period) => {
      const value = period[metric];
      return [
        period.label,
        isMoney ? formatRupiah(value) : formatNumber(value),
      ];
    }),
  };
}
