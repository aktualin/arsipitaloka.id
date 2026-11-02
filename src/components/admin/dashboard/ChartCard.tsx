"use client";

import { useState, type ReactNode } from "react";

/**
 * Kartu grafik: judul, keterangan, dan tombol alih tampilan Grafik/Tabel.
 *
 * Tabel selalu tersedia — ini relieving wajib untuk warna yang kontrastnya
 * di bawah 3:1, sekaligus membuat data bisa dibaca tanpa hover dan oleh
 * pembaca layar.
 */
export default function ChartCard({
  title,
  subtitle,
  table,
  height = 280,
  children,
}: {
  title: string;
  subtitle?: string;
  table?: { columns: string[]; rows: (string | number)[][] };
  height?: number;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-bold text-black">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{subtitle}</p>
          ) : null}
        </div>

        {table ? (
          <button
            type="button"
            onClick={() => setShowTable((value) => !value)}
            aria-pressed={showTable}
            className="shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            {showTable ? "Grafik" : "Tabel"}
          </button>
        ) : null}
      </header>

      {showTable && table ? (
        <div className="-mx-1 max-h-[280px] overflow-auto px-1">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                {table.columns.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={`border-b border-neutral-200 py-2 pr-3 font-medium ${
                      index === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-neutral-100 last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`py-2 pr-3 ${
                        cellIndex === 0
                          ? "text-left text-neutral-700"
                          : "text-right tabular-nums text-neutral-800"
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
      ) : (
        <div style={{ height }} className="w-full">
          {children}
        </div>
      )}
    </section>
  );
}
