"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Konteks "buku yang sudah dimiliki user".
 *
 * Satu request saja per halaman (`/api/library/owned`), hasilnya dipakai
 * bersama oleh semua kartu buku di halaman itu. Tujuannya: buku yang sudah
 * dibeli tidak lagi menampilkan tombol "Beli"/"Keranjang".
 *
 * Halaman katalog & beranda tetap bisa di-cache di server (halaman publik),
 * jadi pengecekan kepemilikan dilakukan di client — bukan dengan membaca
 * cookie di Server Component.
 */
type OwnedBooksValue = {
  /** Id buku yang sudah dibeli (order lunas). */
  owned: Set<string>;
  /** Selesai memuat? (selama belum selesai, kartu tampil apa adanya) */
  ready: boolean;
};

const OwnedBooksContext = createContext<OwnedBooksValue>({
  owned: new Set<string>(),
  ready: false,
});

export function useOwnedBooks(): OwnedBooksValue {
  return useContext(OwnedBooksContext);
}

export default function OwnedBooksProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [owned, setOwned] = useState<Set<string>>(new Set<string>());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let aktif = true;

    fetch("/api/library/owned", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { bookIds: [] }))
      .then((data: { bookIds?: string[] }) => {
        if (!aktif) return;
        setOwned(new Set(data.bookIds ?? []));
      })
      .catch(() => {
        /* diamkan: tampilan tetap seperti biasa */
      })
      .finally(() => {
        if (aktif) setReady(true);
      });

    return () => {
      aktif = false;
    };
  }, []);

  return (
    <OwnedBooksContext.Provider value={{ owned, ready }}>
      {children}
    </OwnedBooksContext.Provider>
  );
}
