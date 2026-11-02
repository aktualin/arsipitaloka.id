/**
 * Palet warna dashboard admin.
 *
 * Modul ini sengaja **tidak** menandai "use client" supaya bisa dipakai
 * oleh komponen server maupun client tanpa menarik bundel Chart.js.
 *
 * Palet kategorikal sudah divalidasi (band lightness, chroma, jarak CVD
 * antar warna bersebelahan, kontras). Urutan slot tidak boleh diacak dan
 * tidak boleh diputar: warna mengikuti entitas, bukan peringkat.
 */
export const SERIES_COLORS = [
  "#2a78d6", // biru
  "#eb6834", // jingga
  "#1baf7a", // aqua
  "#eda100", // kuning
  "#e87ba4", // magenta
  "#008300", // hijau
  "#6250d6", // violet
  "#e34948", // merah
] as const;

/** Slot 1 → nilai uang · slot 2 → jumlah · slot 3 → rata-rata/rasio. */
export const COLOR_MONEY = SERIES_COLORS[0];
export const COLOR_COUNT = SERIES_COLORS[1];
export const COLOR_RATE = SERIES_COLORS[2];

/** Warna status — dipakai delta KPI, selalu bersama ikon + label. */
export const STATUS_GOOD = "#0ca30c";
export const STATUS_CRITICAL = "#d03b3b";
