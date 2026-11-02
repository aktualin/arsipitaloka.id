import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../../prisma/generated/prisma/client";
import {
  bucketKeys,
  bucketLabel,
  dayKey,
  hourInWib,
  monthKey,
  previousRange,
  weekdayInWib,
  type ReportRange,
} from "./date-range";

/**
 * Agregasi statistik untuk dashboard admin.
 *
 * Semua perhitungan净水藏在 server: halaman hanya menerima angka yang sudah
 * diringkas, jadi browser tidak pernah menarik ribuan baris order.
 *
 * Konvensi: seluruh metrik dihitung berdasarkan **tanggal order dibuat**
 * (`createdAt`), bukan `paidAt`, supaya filter tanggal berlaku sama untuk
 * semua grafik dan tabel.
 */

export const PAID_STATUSES = ["PAID", "SHIPPED", "COMPLETED"] as const;

export type OrderStatusKey =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export const ORDER_STATUS_LABELS: Record<OrderStatusKey, string> = {
  PENDING: "Belum Bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const ORDER_STATUS_ORDER: OrderStatusKey[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

/**
 * Label metode pembayaran.
 *
 * Nilai diambil dari `Order.paymentMethod` — payment gateway (Midtrans Snap)
 * menulis kode metode yang dipilih pembeli, sedangkan order gratis memakai
 * "FREE". Kode yang tidak dikenal ditampilkan apa adanya.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  QRIS: "QRIS",
  VA: "Virtual Account",
  E_WALLET: "E-Wallet",
  EWALLET: "E-Wallet",
  SNAP: "Snap (Midtrans)",
  FREE: "Gratis",
  BANK_TRANSFER: "Transfer Bank",
  CREDIT_CARD: "Kartu Kredit",
  RETAIL_OUTLET: "Gerai Ritel",
};

export type Metric = {
  value: number;
  previous: number;
  /** Persentase perubahan vs periode sebelumnya (null kalau sebelumnya 0). */
  delta: number | null;
};

export type PeriodRow = {
  key: string;
  label: string;
  orders: number;
  paidOrders: number;
  revenue: number;
  items: number;
  newUsers: number;
  aov: number;
  cumulativeRevenue: number;
  statusCounts: Record<OrderStatusKey, number>;
};

export type BookRow = {
  bookId: string;
  title: string;
  category: string;
  qty: number;
  revenue: number;
  orders: number;
};

export type CategoryRow = {
  name: string;
  qty: number;
  revenue: number;
};

export type BreakdownRow = {
  key: string;
  label: string;
  count: number;
  amount: number;
};

export type CustomerRow = {
  name: string;
  email: string;
  orders: number;
  paidOrders: number;
  items: number;
  revenue: number;
};

export type TimeBucketRow = {
  key: string;
  label: string;
  orders: number;
  revenue: number;
};

export type DashboardStats = {
  kpi: {
    revenue: Metric;
    orders: Metric;
    aov: Metric;
    itemsSold: Metric;
    newUsers: Metric;
    pending: { count: number; amount: number };
    conversion: { value: number; previous: number };
  };
  periods: PeriodRow[];
  articlesByPeriod: {
    labels: string[];
    datasets: { label: string; values: number[] }[];
  };
  statusBreakdown: BreakdownRow[];
  paymentBreakdown: BreakdownRow[];
  deliveryBreakdown: BreakdownRow[];
  providerBreakdown: BreakdownRow[];
  topCustomers: CustomerRow[];
  topCustomersByOrders: CustomerRow[];
  ordersByHour: TimeBucketRow[];
  ordersByWeekday: TimeBucketRow[];
  topBooksByRevenue: BookRow[];
  topBooksByQty: BookRow[];
  byCategory: CategoryRow[];
  freeVsPaid: { freeQty: number; paidQty: number; freeRevenue: number; paidRevenue: number };
  content: {
    books: number;
    archivedBooks: number;
    freeBooks: number;
    categories: number;
    articles: { type: string; label: string; count: number; published: number }[];
    documentation: number;
    videos: number;
    tiktok: number;
    users: number;
    activeUsers: number;
    admins: number;
  };
};

/**
 * Label jenis artikel.
 *
 * Kuncinya mengikuti nilai `Article.type` yang benar-benar dipakai di
 * database (`berita-terkini`, `blog`, `umkm` — huruf kecil semua).
 * Varian huruf besar ikut dicantumkan supaya data lama/import tidak
 * menampilkan label mentah.
 */
export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  "berita-terkini": "Berita Terkini",
  blog: "Blog",
  umkm: "UMKM",
  UMKM: "UMKM",
};

export type OrderRow = {
  id: string;
  status: OrderStatusKey;
  total: number;
  subtotal: number;
  taxAmount: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
  deliveryMethod: string | null;
  paidAt: Date | null;
  createdAt: Date;
  user: { name: string; email: string };
  items: { bookId: string; title: string; qty: number; priceUsd: number }[];
  usdToIdrRate: number;
};

/**
 * Select Prisma untuk membentuk `OrderRow`.
 *
 * Dipakai bersama oleh agregasi dashboard, tabel transaksi, dan ekspor —
 * supaya semua sumber data memilih kolom yang sama.
 */
export const ORDER_ROW_SELECT = {
  id: true,
  status: true,
  total: true,
  subtotal: true,
  taxAmount: true,
  paymentMethod: true,
  paymentProvider: true,
  deliveryMethod: true,
  paidAt: true,
  createdAt: true,
  usdToIdrRate: true,
  user: { select: { name: true, email: true } },
  items: {
    select: { bookId: true, title: true, qty: true, priceUsd: true },
  },
} as const;

/** Ubah baris mentah Prisma menjadi `OrderRow` (angka Decimal → number). */
export function mapOrderRow(row: {
  id: string;
  status: OrderStatusKey;
  total: unknown;
  subtotal: unknown;
  taxAmount: unknown;
  paymentMethod: string | null;
  paymentProvider: string | null;
  deliveryMethod: string | null;
  paidAt: Date | null;
  createdAt: Date;
  usdToIdrRate: unknown;
  user: { name: string; email: string };
  items: { bookId: string; title: string; qty: number; priceUsd: unknown }[];
}): OrderRow {
  return {
    id: row.id,
    status: row.status,
    total: toNumber(row.total),
    subtotal: toNumber(row.subtotal),
    taxAmount: toNumber(row.taxAmount),
    paymentMethod: row.paymentMethod,
    paymentProvider: row.paymentProvider,
    deliveryMethod: row.deliveryMethod,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    usdToIdrRate: toNumber(row.usdToIdrRate) || 1,
    user: row.user,
    items: row.items.map((item) => ({
      bookId: item.bookId,
      title: item.title,
      qty: item.qty,
      priceUsd: toNumber(item.priceUsd),
    })),
  };
}

function isPaid(status: OrderStatusKey): boolean {
  return (PAID_STATUSES as readonly string[]).includes(status);
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

/** Ringkasan satu kumpulan order (dipakai untuk periode ini & sebelumnya). */
function summarise(orders: OrderRow[]) {
  let revenue = 0;
  let paidOrders = 0;
  let items = 0;

  for (const order of orders) {
    const qty = order.items.reduce((sum, item) => sum + item.qty, 0);
    items += qty;
    if (isPaid(order.status)) {
      paidOrders += 1;
      revenue += order.total;
    }
  }

  return {
    revenue,
    orders: orders.length,
    paidOrders,
    items,
    aov: paidOrders > 0 ? revenue / paidOrders : 0,
  };
}

function toMetric(value: number, previous: number): Metric {
  const delta =
    previous === 0 ? null : ((value - previous) / Math.abs(previous)) * 100;
  return { value, previous, delta };
}

/**
 * Ambil seluruh order dalam satu rentang (tanpa paginasi).
 *
 * Dipakai untuk agregasi di server. Halaman hanya menerima angka yang sudah
 * diringkas, jadi browser tidak pernah menarik ribuan baris order.
 */
export async function getOrdersForRange(
  from: Date,
  to: Date,
): Promise<OrderRow[]> {
  const rows = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: ORDER_ROW_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) =>
    mapOrderRow({ ...row, status: row.status as OrderStatusKey }),
  );
}

export type OrderFilters = {
  status?: OrderStatusKey;
  q?: string;
};

/**
 * Susun klausa WHERE order dari rentang tanggal + filter status/pencarian.
 *
 * Satu sumber untuk tabel transaksi dan file unduhan — supaya yang
 * diunduh persis sama dengan yang tampil di layar.
 */
export function buildOrderWhere(
  range: ReportRange,
  filters: OrderFilters = {},
): Prisma.OrderWhereInput {
  const { status, q } = filters;

  return {
    createdAt: { gte: range.from, lte: range.to },
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { items: { some: { title: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

/** Ambil order yang cocok filter (tanpa paginasi) — untuk ekspor. */
export async function getFilteredOrders(
  range: ReportRange,
  filters: OrderFilters = {},
): Promise<OrderRow[]> {
  const rows = await prisma.order.findMany({
    where: buildOrderWhere(range, filters),
    select: ORDER_ROW_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) =>
    mapOrderRow({ ...row, status: row.status as OrderStatusKey }),
  );
}

/** Sama dengan `getOrdersForRange`, dipakai di dalam agregasi dashboard. */
async function fetchOrders(from: Date, to: Date): Promise<OrderRow[]> {
  return getOrdersForRange(from, to);
}

/** Ekspor baris order untuk tabel transaksi & file unduhan. */
export type TransactionRow = {
  id: string;
  date: Date;
  paidAt: Date | null;
  customer: string;
  email: string;
  status: OrderStatusKey;
  statusLabel: string;
  paymentMethod: string;
  paymentProvider: string;
  deliveryMethod: string;
  items: { title: string; qty: number; amount: number }[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
};

/**
 * Bagi sebuah nominal order ke tiap item, proporsional terhadap snapshot
 * harga item.
 *
 * Harga buku di database sudah Rupiah (lihat `src/lib/pricing.ts`), jadi
 * `usdToIdrRate` **tidak boleh** dipakai dalam perhitungan nominal — kolom
 * itu sisa skema harga USD lama dan isinya tidak lagi bermakna.
 *
 * Nominal yang dialokasikan jadi parameter, karena dua pemakai butuh
 * acuan berbeda:
 * - tabel transaksi → `order.subtotal` (jumlah nominal item harus cocok
 *   dengan kolom Subtotal, yang terpisah dari Pajak dan Total);
 * - agregasi pendapatan → `order.total` (uang yang benar-benar ditagihkan,
 *   supaya KPI "Pendapatan" dan total per buku/kategori/pelanggan identik).
 *
 * Tiap item dapat bagian proporsional dari `priceUsd * qty`, dibulatkan, lalu
 * sisa pembulatan diberikan ke item terbesar. Hasilnya: jumlah bagian = persis
 * nominal yang dialokasikan, dan order satu item selalu dapat seluruh
 * nominalnya.
 *
 * Kalau semua harga item 0 (mis. order gratis penuh), semua bagiannya 0.
 */
function alokasiNominalPerItem(
  nominal: number,
  items: { qty: number; priceUsd: number }[],
): number[] {
  if (items.length === 0) return [];

  const bobot = items.map((item) => item.priceUsd * item.qty);
  const totalBobot = bobot.reduce((sum, value) => sum + value, 0);
  if (totalBobot <= 0) return items.map(() => 0);

  const bagian = bobot.map((weight) =>
    Math.round((nominal * weight) / totalBobot),
  );

  // Sisa pembulatan diberikan ke item terberat, supaya totalnya pas dengan nominal.
  const sisa = nominal - bagian.reduce((sum, value) => sum + value, 0);
  if (sisa !== 0) {
    let idxTerbesar = 0;
    for (let i = 1; i < bobot.length; i += 1) {
      if (bobot[i] > bobot[idxTerbesar]) idxTerbesar = i;
    }
    bagian[idxTerbesar] += sisa;
  }

  return bagian;
}

/**
 * Ubah order menjadi baris tabel transaksi.
 *
 * Nominal diambil dari snapshot di order (`subtotal`, `taxAmount`, `total`),
 * bukan dihitung ulang — supaya angkanya identik dengan yang ditagihkan ke
 * purchasers. Harga buku sudah dalam Rupiah dan kurs selalu 1, jadi nominal per
 * item dihitung dengan membagi `subtotal` order ke tiap item secara
 * proporsional (lihat `alokasiNominalPerItem`) — bukan dikalikan
 * `usdToIdrRate` yang sudah tidak relevan.
 */
export function toTransactionRows(orders: OrderRow[]): TransactionRow[] {
  return orders.map((order) => {
    const alokasi = alokasiNominalPerItem(order.subtotal, order.items);
    const items = order.items.map((item, index) => ({
      title: item.title,
      qty: item.qty,
      amount: alokasi[index] ?? 0,
    }));
    return {
      id: order.id,
      date: order.createdAt,
      paidAt: order.paidAt,
      customer: order.user.name,
      email: order.user.email,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status],
      paymentMethod: order.paymentMethod ?? "—",
      paymentProvider: order.paymentProvider ?? "—",
      deliveryMethod:
        order.deliveryMethod === "DELIVERY" ? "Kirim" : "Unduh",
      items,
      itemCount: items.reduce((sum, item) => sum + item.qty, 0),
      subtotal: order.subtotal,
      tax: order.taxAmount,
      total: order.total,
    };
  });
}

/**
 * Ambil semua agregasi dashboard untuk satu rentang tanggal.
 */
export async function getDashboardStats(range: ReportRange): Promise<DashboardStats> {
  const prev = previousRange(range);

  const [orders, previous, users, previousUsers, articles, books, categories, videoCount, tiktokCount] =
    await Promise.all([
      fetchOrders(range.from, range.to),
      fetchOrders(prev.from, prev.to),
      prisma.user.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
        select: { createdAt: true },
      }),
      prisma.user.count({
        where: { createdAt: { gte: prev.from, lte: prev.to } },
      }),
      prisma.article.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
        select: { type: true, published: true, createdAt: true },
      }),
      prisma.book.findMany({
        select: {
          id: true,
          title: true,
          isFree: true,
          category: { select: { name: true } },
        },
      }),
      prisma.category.count(),
      prisma.socialMedia.count(),
      prisma.tiktokPost.count(),
    ]);

  const bookMeta = new Map(
    books.map((book) => [
      book.id,
      {
        title: book.title,
        isFree: book.isFree,
        category: book.category?.name ?? "Tanpa Kategori",
      },
    ]),
  );

  // --- Ringkasan per periode ---------------------------------------------
  const keys = bucketKeys(range);
  const periodMap = new Map<
    string,
    {
      orders: number;
      paidOrders: number;
      revenue: number;
      items: number;
      newUsers: number;
      statusCounts: Record<OrderStatusKey, number>;
    }
  >();

  for (const key of keys) {
    periodMap.set(key, {
      orders: 0,
      paidOrders: 0,
      revenue: 0,
      items: 0,
      newUsers: 0,
      statusCounts: {
        PENDING: 0,
        PAID: 0,
        SHIPPED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      },
    });
  }

  const keyOf = (date: Date) =>
    range.granularity === "monthly" ? monthKey(date) : dayKey(date);

  for (const order of orders) {
    const bucket = periodMap.get(keyOf(order.createdAt));
    if (!bucket) continue;
    bucket.orders += 1;
    bucket.statusCounts[order.status] += 1;
    const qty = order.items.reduce((sum, item) => sum + item.qty, 0);
    bucket.items += qty;
    if (isPaid(order.status)) {
      bucket.paidOrders += 1;
      bucket.revenue += order.total;
    }
  }

  for (const user of users) {
    const bucket = periodMap.get(keyOf(user.createdAt));
    if (bucket) bucket.newUsers += 1;
  }

  const periods: PeriodRow[] = [];
  let running = 0;
  for (const key of keys) {
    const bucket = periodMap.get(key)!;
    running += bucket.revenue;
    periods.push({
      key,
      label: bucketLabel(key, range.granularity),
      orders: bucket.orders,
      paidOrders: bucket.paidOrders,
      revenue: bucket.revenue,
      items: bucket.items,
      newUsers: bucket.newUsers,
      aov: bucket.paidOrders > 0 ? bucket.revenue / bucket.paidOrders : 0,
      cumulativeRevenue: running,
      statusCounts: bucket.statusCounts,
    });
  }

  // --- KPI ---------------------------------------------------------------
  const current = summarise(orders);
  const prior = summarise(previous);

  const pendingOrders = orders.filter((order) => order.status === "PENDING");
  const newUserCount = users.length;
  const previousUserCount = previousUsers;

  // --- Rincian produk ----------------------------------------------------
  const bookAgg = new Map<string, { qty: number; revenue: number; orders: number }>();
  const categoryAgg = new Map<string, { qty: number; revenue: number }>();
  let freeQty = 0;
  let paidQty = 0;
  let freeRevenue = 0;
  let paidRevenue = 0;

  for (const order of orders) {
    if (!isPaid(order.status)) continue;
    // Nominal per item dibagi dari total resmi order (subtotal + pajak) —
    // uang yang benar-benar ditagihkan — supaya KPI "Pendapatan", total per
    // buku, per kategori, dan per pelanggan identik.
    const alokasi = alokasiNominalPerItem(order.total, order.items);
    order.items.forEach((item, index) => {
      const meta = bookMeta.get(item.bookId);
      const amount = alokasi[index] ?? 0;
      const agg = bookAgg.get(item.bookId) ?? { qty: 0, revenue: 0, orders: 0 };
      agg.qty += item.qty;
      agg.revenue += amount;
      agg.orders += 1;
      bookAgg.set(item.bookId, agg);

      const categoryName = meta?.category ?? "Tanpa Kategori";
      const catAgg = categoryAgg.get(categoryName) ?? { qty: 0, revenue: 0 };
      catAgg.qty += item.qty;
      catAgg.revenue += amount;
      categoryAgg.set(categoryName, catAgg);

      if (meta?.isFree) {
        freeQty += item.qty;
        freeRevenue += amount;
      } else {
        paidQty += item.qty;
        paidRevenue += amount;
      }
    });
  }

  const bookRows: BookRow[] = [...bookAgg.entries()].map(
    ([bookId, agg]) => ({
      bookId,
      title: bookMeta.get(bookId)?.title ?? bookId,
      category: bookMeta.get(bookId)?.category ?? "Tanpa Kategori",
      qty: agg.qty,
      revenue: agg.revenue,
      orders: agg.orders,
    }),
  );

  const topBooksByRevenue = [...bookRows]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const topBooksByQty = [...bookRows]
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, 10);

  const byCategory: CategoryRow[] = [...categoryAgg.entries()]
    .map(([name, agg]) => ({ name, qty: agg.qty, revenue: agg.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // --- Rincian status & metode pembayaran --------------------------------
  const statusAgg = new Map<OrderStatusKey, { count: number; amount: number }>();
  const paymentAgg = new Map<string, { count: number; amount: number }>();
  const deliveryAgg = new Map<string, { count: number; amount: number }>();
  const providerAgg = new Map<string, { count: number; amount: number }>();
  const customerAgg = new Map<
    string,
    { name: string; email: string; orders: number; paidOrders: number; items: number; revenue: number }
  >();
  const hourAgg = new Map<number, { orders: number; revenue: number }>();
  const weekdayAgg = new Map<number, { orders: number; revenue: number }>();

  for (const order of orders) {
    const status = statusAgg.get(order.status) ?? { count: 0, amount: 0 };
    status.count += 1;
    status.amount += order.total;
    statusAgg.set(order.status, status);

    const paymentKey = order.paymentMethod ?? "LAINNYA";
    const payment = paymentAgg.get(paymentKey) ?? { count: 0, amount: 0 };
    payment.count += 1;
    payment.amount += order.total;
    paymentAgg.set(paymentKey, payment);

    const deliveryKey = order.deliveryMethod === "DELIVERY" ? "KIRIM" : "UNDUH";
    const delivery = deliveryAgg.get(deliveryKey) ?? { count: 0, amount: 0 };
    delivery.count += 1;
    delivery.amount += order.total;
    deliveryAgg.set(deliveryKey, delivery);

    const providerKey = order.paymentProvider ?? "LAINNYA";
    const provider = providerAgg.get(providerKey) ?? { count: 0, amount: 0 };
    provider.count += 1;
    provider.amount += order.total;
    providerAgg.set(providerKey, provider);

    // Pelanggan
    const customerKey = order.user.email;
    const customer = customerAgg.get(customerKey) ?? {
      name: order.user.name,
      email: order.user.email,
      orders: 0,
      paidOrders: 0,
      items: 0,
      revenue: 0,
    };
    customer.orders += 1;
    customer.items += order.items.reduce((sum, item) => sum + item.qty, 0);
    if (isPaid(order.status)) {
      customer.paidOrders += 1;
      customer.revenue += order.total;
    }
    customerAgg.set(customerKey, customer);

    // Jam & hari (WIB)
    const hour = hourInWib(order.createdAt);
    const hourEntry = hourAgg.get(hour) ?? { orders: 0, revenue: 0 };
    hourEntry.orders += 1;
    if (isPaid(order.status)) hourEntry.revenue += order.total;
    hourAgg.set(hour, hourEntry);

    const weekday = weekdayInWib(order.createdAt);
    const weekdayEntry = weekdayAgg.get(weekday) ?? { orders: 0, revenue: 0 };
    weekdayEntry.orders += 1;
    if (isPaid(order.status)) weekdayEntry.revenue += order.total;
    weekdayAgg.set(weekday, weekdayEntry);
  }

  const statusBreakdown: BreakdownRow[] = ORDER_STATUS_ORDER.map((key) => ({
    key,
    label: ORDER_STATUS_LABELS[key],
    count: statusAgg.get(key)?.count ?? 0,
    amount: statusAgg.get(key)?.amount ?? 0,
  }));

  const paymentBreakdown: BreakdownRow[] = [...paymentAgg.entries()]
    .map(([key, agg]) => ({
      key,
      label: PAYMENT_METHOD_LABELS[key] ?? (key === "LAINNYA" ? "Lainnya" : key),
      count: agg.count,
      amount: agg.amount,
    }))
    .sort((a, b) => b.count - a.count);

  const deliveryBreakdown: BreakdownRow[] = [...deliveryAgg.entries()]
    .map(([key, agg]) => ({
      key,
      label: key === "KIRIM" ? "Kirim Fisik" : "Unduh Digital",
      count: agg.count,
      amount: agg.amount,
    }))
    .sort((a, b) => b.count - a.count);

  const providerBreakdown: BreakdownRow[] = [...providerAgg.entries()]
    .map(([key, agg]) => ({
      key,
      label:
        key === "midtrans"
          ? "Midtrans"
          : key === "free"
            ? "Gratis"
            : key === "manual"
              ? "Manual"
              : key === "LAINNYA"
                ? "Lainnya"
                : key,
      count: agg.count,
      amount: agg.amount,
    }))
    .sort((a, b) => b.count - a.count);

  const topCustomers: CustomerRow[] = [...customerAgg.values()]
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
    .slice(0, 10);

  // Pelanggan dengan order terbanyak — urutan berbeda dari `topCustomers`
  // (yang diurutkan dari total belanja). Semua pelanggan dipertimbangkan,
  // bukan hanya 10 teratas dari daftar belanja.
  const topCustomersByOrders: CustomerRow[] = [...customerAgg.values()]
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
    .slice(0, 10);

  const ordersByHour: TimeBucketRow[] = Array.from(
    { length: 24 },
    (_, hour) => {
      const agg = hourAgg.get(hour);
      return {
        key: String(hour).padStart(2, "0"),
        label: `${String(hour).padStart(2, "0")}:00`,
        orders: agg?.orders ?? 0,
        revenue: agg?.revenue ?? 0,
      };
    },
  );

  const ordersByWeekday: TimeBucketRow[] = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ].map((label, index) => {
    const agg = weekdayAgg.get(index);
    return {
      key: String(index),
      label,
      orders: agg?.orders ?? 0,
      revenue: agg?.revenue ?? 0,
    };
  });

  // --- Konten ------------------------------------------------------------
  const articleAgg = new Map<string, { count: number; published: number }>();
  for (const article of articles) {
    const agg = articleAgg.get(article.type) ?? { count: 0, published: 0 };
    agg.count += 1;
    if (article.published) agg.published += 1;
    articleAgg.set(article.type, agg);
  }

  const [
    bookCount,
    archivedBooks,
    freeBooks,
    documentation,
    totalUsers,
    activeUsers,
    adminCount,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.book.count({ where: { archived: true } }),
    prisma.book.count({ where: { isFree: true } }),
    prisma.documentation.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  return {
    kpi: {
      revenue: toMetric(current.revenue, prior.revenue),
      orders: toMetric(current.orders, prior.orders),
      aov: toMetric(current.aov, prior.aov),
      itemsSold: toMetric(current.items, prior.items),
      newUsers: toMetric(newUserCount, previousUserCount),
      pending: {
        count: pendingOrders.length,
        amount: pendingOrders.reduce((sum, order) => sum + order.total, 0),
      },
      conversion: {
        value: newUserCount > 0 ? current.orders / newUserCount : 0,
        previous:
          previousUserCount > 0 ? prior.orders / previousUserCount : 0,
      },
    },
    periods,
    articlesByPeriod: articlesByPeriod(
      periods,
      articles.map((article) => ({ type: article.type, createdAt: article.createdAt })),
      range.granularity,
    ),
    statusBreakdown,
    paymentBreakdown,
    deliveryBreakdown,
    providerBreakdown,
    topCustomers,
    topCustomersByOrders,
    ordersByHour,
    ordersByWeekday,
    topBooksByRevenue,
    topBooksByQty,
    byCategory,
    freeVsPaid: { freeQty, paidQty, freeRevenue, paidRevenue },
    content: {
      books: bookCount,
      archivedBooks,
      freeBooks,
      categories,
      articles: [...articleAgg.entries()].map(([type, agg]) => ({
        type,
        label: ARTICLE_TYPE_LABELS[type] ?? type,
        count: agg.count,
        published: agg.published,
      })),
      documentation,
      videos: videoCount,
      tiktok: tiktokCount,
      users: totalUsers,
      activeUsers,
      admins: adminCount,
    },
  };
}

/**
 * Deret waktu artikel terbit per tipe — untuk grafik stacked "konten terbit".
 */
export function articlesByPeriod(
  periods: PeriodRow[],
  articles: { type: string; createdAt: Date }[],
  granularity: ReportRange["granularity"],
): { labels: string[]; datasets: { label: string; values: number[] }[] } {
  const labels = periods.map((period) => period.label);
  const types = [...new Set(articles.map((article) => article.type))];

  return {
    labels,
    datasets: types.map((type) => {
      const byKey = new Map<string, number>();
      for (const article of articles) {
        if (article.type !== type) continue;
        const key =
          granularity === "monthly" ? monthKey(article.createdAt) : dayKey(article.createdAt);
        byKey.set(key, (byKey.get(key) ?? 0) + 1);
      }
      return {
        label: ARTICLE_TYPE_LABELS[type] ?? type,
        values: periods.map((period) => byKey.get(period.key) ?? 0),
      };
    }),
  };
}
