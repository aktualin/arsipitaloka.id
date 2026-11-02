import { formatNumber, formatRupiah } from "@/lib/admin/report-format";
import type { DashboardStats } from "@/lib/admin/stats";
import DataTable from "@/components/admin/dashboard/DataTable";

/**
 * Tabel rinci dashboard: ringkasan per periode, penjualan per buku & kategori,
 * pelanggan teratas, dan persediaan konten.
 */
export default function DashboardTables({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="font-heading text-base font-bold text-black">
          Ringkasan Per Periode
        </h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          {stats.periods.length} periode · klik tombol &quot;Tabel&quot; di tiap
          grafik untuk melihat angka yang sama per grafik.
        </p>

        <div className="mt-4 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                {["Periode", "Order", "Lunas", "Pendapatan", "Item", "AOV", "Akumulasi"].map(
                  (column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={`border-b border-neutral-200 py-2 pr-3 font-medium ${
                        index === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {column}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {stats.periods.map((period) => (
                <tr key={period.key} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 pr-3 text-neutral-700">{period.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatNumber(period.orders)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatNumber(period.paidOrders)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatRupiah(period.revenue)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatNumber(period.items)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatRupiah(period.aov)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                    {formatRupiah(period.cumulativeRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DataTable
        title="Penjualan per Buku"
        columns={["Judul", "Kategori", "Terjual", "Order", "Pendapatan"]}
        align={["left", "left", "right", "right", "right"]}
        rows={stats.topBooksByRevenue.map((book) => [
          book.title,
          book.category,
          formatNumber(book.qty),
          formatNumber(book.orders),
          formatRupiah(book.revenue),
        ])}
      />

      <DataTable
        title="Penjualan per Kategori"
        columns={["Kategori", "Terjual", "Pendapatan"]}
        align={["left", "right", "right"]}
        rows={stats.byCategory.map((category) => [
          category.name,
          formatNumber(category.qty),
          formatRupiah(category.revenue),
        ])}
      />

      <DataTable
        title="Pelanggan Teratas"
        columns={["Nama", "Email", "Order", "Lunas", "Item", "Belanja"]}
        align={["left", "left", "right", "right", "right", "right"]}
        rows={stats.topCustomers.map((customer) => [
          customer.name,
          customer.email,
          formatNumber(customer.orders),
          formatNumber(customer.paidOrders),
          formatNumber(customer.items),
          formatRupiah(customer.revenue),
        ])}
      />

      <DataTable
        title="Persediaan Konten"
        columns={["Jenis", "Jumlah", "Catatan"]}
        align={["left", "right", "left"]}
        rows={[
          [
            "Buku",
            formatNumber(stats.content.books),
            `${stats.content.freeBooks} gratis · ${stats.content.archivedBooks} diarsipkan`,
          ],
          ["Kategori", formatNumber(stats.content.categories), ""],
          ["Dokumentasi", formatNumber(stats.content.documentation), ""],
          ["Video YouTube", formatNumber(stats.content.videos), ""],
          ["Video TikTok", formatNumber(stats.content.tiktok), ""],
          [
            "Pengguna",
            formatNumber(stats.content.users),
            `${stats.content.activeUsers} aktif · ${stats.content.admins} admin`,
          ],
        ]}
      />
    </div>
  );
}
