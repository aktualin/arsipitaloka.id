/**
 * Navigasi antar-bagian di halaman dashboard admin.
 *
 * Halaman dashboard sudah panjang (KPI → grafik → tabel → transaksi), jadi
 * navbar ini memudahkan lompat ke bagian tertentu tanpa memuat halaman lain.
 *
 * murni anchor (`#id`) — tanpa JavaScript, jadi aman di server component.
 */

const SECTIONS = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "grafik", label: "Grafik" },
  { id: "produk", label: "Produk & Pelanggan" },
  { id: "transaksi", label: "Transaksi" },
];

export default function SectionNav() {
  return (
    <nav
      aria-label="Bagian dashboard"
      className="flex gap-1 overflow-x-auto border-b border-neutral-200 pb-px"
    >
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-3.5 py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
