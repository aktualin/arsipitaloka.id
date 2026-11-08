"use client";

import { useEffect, useState } from "react";

/**
 * Kontrol bulk action untuk tabel admin: centang "pilih semua", hitung jumlah
 * baris terpilih, dan tombol "Hapus terpilih".
 *
 * Checkbox per baris dirender oleh tabel (server component) di dalam form yang
 * sama, jadi komponen inisinkronkan lewat event DOM pada form tersebut.
 */
export default function BulkDeleteControls({
  formId,
  entityLabel,
}: {
  formId: string;
  entityLabel: string;
}) {
  const [count, setCount] = useState(0);
  const [all, setAll] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;

    const boxes = () =>
      Array.from(
        form.querySelectorAll<HTMLInputElement>('input[name="ids"]'),
      );

    const update = () => {
      const list = boxes();
      const checked = list.filter((box) => box.checked).length;
      setCount(checked);
      setAll(list.length > 0 && checked === list.length);
    };

    const onChange = () => update();
    form.addEventListener("change", onChange);
    update();
    return () => form.removeEventListener("change", onChange);
  }, [formId]);

  const toggleAll = () => {
    const form = document.getElementById(formId);
    if (!form) return;
    const list = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="ids"]'),
    );
    const next = !all;
    list.forEach((box) => {
      box.checked = next;
    });
    setCount(next ? list.length : 0);
    setAll(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex min-h-9 items-center gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={all}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-neutral-300 accent-maroon-dark"
        />
        Pilih semua di halaman ini
      </label>
      <span className="text-xs text-neutral-500">{count} dipilih</span>
      <button
        type="submit"
        disabled={count === 0}
        onClick={(event) => {
          if (!confirm(`Yakin menghapus ${count} ${entityLabel} terpilih?`)) {
            event.preventDefault();
          }
        }}
        className="inline-flex min-h-9 items-center rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-40"
      >
        Hapus terpilih
      </button>
    </div>
  );
}
