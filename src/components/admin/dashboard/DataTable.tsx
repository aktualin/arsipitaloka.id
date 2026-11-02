/**
 * Tabel data generik untuk laporan admin.
 *
 * Kolom uang/jumlah rata-rata sudah diformat lebih dulu oleh pemanggil,
 * jadi komponen ini hanya urusan tata letak.
 */
export default function DataTable({
  title,
  subtitle,
  columns,
  align,
  rows,
  emptyText = "Belum ada data pada periode ini.",
}: {
  title: string;
  subtitle?: string;
  columns: string[];
  align: ("left" | "right")[];
  rows: (string | number)[][];
  emptyText?: string;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <h2 className="font-heading text-base font-bold text-black">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">{emptyText}</p>
      ) : (
        <div className="mt-4 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={`border-b border-neutral-200 py-2 pr-3 font-medium ${
                      align[index] === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-neutral-100 last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`py-2 pr-3 ${
                        align[cellIndex] === "right"
                          ? "text-right tabular-nums text-neutral-800"
                          : "text-left text-neutral-700"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
