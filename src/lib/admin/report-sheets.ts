import type { Sheet } from "./export";
import { formatDateTime } from "./report-format";
import type { DashboardStats, TransactionRow } from "./stats";

/**
 * Susun tabel laporan (Sheet) dari data yang sudah diagregasi di server.
 *
 * Satu sumber untuk tabel di layar dan file unduhan — supaya angka yang
 * dibaca admin di halaman sama persis dengan yang keluar dari file Excel.
 *
 * Kolom uang & jumlah ditulis sebagai **angka** (bukan teks) supaya Excel
 * bisa menjumlahkan dan mengurutkan sendiri.
 */

export function transactionSheet(rows: TransactionRow[]): Sheet {
  return {
    name: "Transaksi",
    columns: [
      { header: "Tanggal", type: "text", width: 20 },
      { header: "ID Order", type: "text", width: 26 },
      { header: "Pembeli", type: "text", width: 24 },
      { header: "Email", type: "text", width: 30 },
      { header: "Status", type: "text", width: 14 },
      { header: "Metode Pembayaran", type: "text", width: 20 },
      { header: "Penyedia", type: "text", width: 12 },
      { header: "Pengiriman", type: "text", width: 14 },
      { header: "Produk", type: "text", width: 42 },
      { header: "Jumlah Item", type: "integer", width: 12 },
      { header: "Subtotal", type: "integer", width: 16 },
      { header: "Pajak", type: "integer", width: 14 },
      { header: "Total", type: "integer", width: 16 },
    ],
    rows: rows.map((row) => [
      formatDateTime(row.date),
      row.id,
      row.customer,
      row.email,
      row.statusLabel,
      row.paymentMethod,
      row.paymentProvider,
      row.deliveryMethod,
      row.items.map((item) => `${item.title} (${item.qty})`).join(", "),
      row.itemCount,
      row.subtotal,
      row.tax,
      row.total,
    ]),
  };
}

export function periodSheet(stats: DashboardStats): Sheet {
  return {
    name: "Statistik Periode",
    columns: [
      { header: "Periode", type: "text", width: 16 },
      { header: "Order", type: "integer", width: 10 },
      { header: "Order Lunas", type: "integer", width: 12 },
      { header: "Pendapatan", type: "integer", width: 16 },
      { header: "Item Terjual", type: "integer", width: 12 },
      { header: "Pengguna Baru", type: "integer", width: 13 },
      { header: "Rata-rata Order", type: "integer", width: 15 },
      { header: "Akumulasi Pendapatan", type: "integer", width: 19 },
    ],
    rows: stats.periods.map((period) => [
      period.label,
      period.orders,
      period.paidOrders,
      period.revenue,
      period.items,
      period.newUsers,
      Math.round(period.aov),
      period.cumulativeRevenue,
    ]),
  };
}

export function bookSheet(stats: DashboardStats): Sheet {
  return {
    name: "Penjualan Buku",
    columns: [
      { header: "Judul", type: "text", width: 42 },
      { header: "Kategori", type: "text", width: 20 },
      { header: "Jumlah Terjual", type: "integer", width: 15 },
      { header: "Jumlah Order", type: "integer", width: 13 },
      { header: "Pendapatan", type: "integer", width: 16 },
    ],
    rows: stats.topBooksByRevenue.map((book) => [
      book.title,
      book.category,
      book.qty,
      book.orders,
      Math.round(book.revenue),
    ]),
  };
}

export function categorySheet(stats: DashboardStats): Sheet {
  return {
    name: "Kategori",
    columns: [
      { header: "Kategori", type: "text", width: 24 },
      { header: "Jumlah Terjual", type: "integer", width: 15 },
      { header: "Pendapatan", type: "integer", width: 16 },
    ],
    rows: stats.byCategory.map((category) => [
      category.name,
      category.qty,
      Math.round(category.revenue),
    ]),
  };
}

export function customerSheet(stats: DashboardStats): Sheet {
  return {
    name: "Pelanggan",
    columns: [
      { header: "Nama", type: "text", width: 24 },
      { header: "Email", type: "text", width: 30 },
      { header: "Order", type: "integer", width: 10 },
      { header: "Order Lunas", type: "integer", width: 12 },
      { header: "Item", type: "integer", width: 10 },
      { header: "Belanja", type: "integer", width: 16 },
    ],
    rows: stats.topCustomers.map((customer) => [
      customer.name,
      customer.email,
      customer.orders,
      customer.paidOrders,
      customer.items,
      Math.round(customer.revenue),
    ]),
  };
}

/**
 * Daftar seluruh akun (rencana webadmin W22) — termasuk admin, bukan hanya
 * pembeli yang sudah pernah belanja.
 */
export function userSheet(
  users: {
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
    orders: number;
  }[],
): Sheet {
  return {
    name: "Pengguna",
    columns: [
      { header: "Nama", type: "text", width: 24 },
      { header: "Email", type: "text", width: 30 },
      { header: "Role", type: "text", width: 12 },
      { header: "Aktif", type: "text", width: 8 },
      { header: "Order", type: "integer", width: 10 },
      { header: "Terdaftar", type: "text", width: 20 },
      { header: "Login Terakhir", type: "text", width: 20 },
    ],
    rows: users.map((user) => [
      user.name,
      user.email,
      user.role === "ADMIN" ? "Admin" : "Pembeli",
      user.isActive ? "Ya" : "Tidak",
      user.orders,
      formatDateTime(user.createdAt),
      user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "-",
    ]),
  };
}

export function statusSheet(stats: DashboardStats): Sheet {  return {
    name: "Status Order",
    columns: [
      { header: "Status", type: "text", width: 18 },
      { header: "Jumlah Order", type: "integer", width: 13 },
      { header: "Nilai", type: "integer", width: 16 },
    ],
    rows: stats.statusBreakdown.map((row) => [
      row.label,
      row.count,
      Math.round(row.amount),
    ]),
  };
}

export function articleSheet(stats: DashboardStats): Sheet {
  return {
    name: "Konten Artikel",
    columns: [
      { header: "Jenis Konten", type: "text", width: 20 },
      { header: "Jumlah", type: "integer", width: 10 },
      { header: "Tayang", type: "integer", width: 10 },
    ],
    rows: stats.content.articles.map((article) => [
      article.label,
      article.count,
      article.published,
    ]),
  };
}

export function contentSheet(stats: DashboardStats): Sheet {
  const content = stats.content;
  return {
    name: "Persediaan Konten",
    columns: [
      { header: "Jenis", type: "text", width: 22 },
      { header: "Jumlah", type: "integer", width: 12 },
      { header: "Catatan", type: "text", width: 34 },
    ],
    rows: [
      ["Buku", content.books, `${content.freeBooks} gratis · ${content.archivedBooks} diarsipkan`],
      ["Kategori", content.categories, ""],
      ["Dokumentasi", content.documentation, ""],
      ["Video YouTube", content.videos, ""],
      ["Video TikTok", content.tiktok, ""],
      ["Pengguna", content.users, `${content.activeUsers} aktif · ${content.admins} admin`],
    ],
  };
}

/**
 * Kumpulan sheet untuk satu jenis laporan.
 *
 * - `transactions` → tabel transaksi lengkap (dan ringkasan periode).
 * - `stats`        → seluruh angka statistik.
 * - `all`          → keduanya.
 */
export function buildSheets(
  report: string,
  stats: DashboardStats,
  transactions: TransactionRow[],
): Sheet[] {
  if (report === "transactions") {
    return [transactionSheet(transactions), periodSheet(stats)];
  }
  if (report === "products") {
    return [bookSheet(stats), categorySheet(stats)];
  }
  if (report === "customers") {
    return [customerSheet(stats)];
  }
  if (report === "content") {
    return [articleSheet(stats), contentSheet(stats)];
  }
  if (report === "stats") {
    return [
      periodSheet(stats),
      statusSheet(stats),
      bookSheet(stats),
      categorySheet(stats),
      customerSheet(stats),
      articleSheet(stats),
      contentSheet(stats),
    ];
  }
  return [
    transactionSheet(transactions),
    periodSheet(stats),
    statusSheet(stats),
    bookSheet(stats),
    categorySheet(stats),
    customerSheet(stats),
    articleSheet(stats),
    contentSheet(stats),
  ];
}
