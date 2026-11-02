"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

/**
 * Palet & aturan grafik dashboard admin.
 *
 * Warna memakai palet kategorikal yang sudah divalidasi (band lightness,
 * chroma, jarak CVD antar warna bersebelahan, kontras). Urutan slot tidak
 * boleh diacak dan tidak boleh diputar: warna mengikuti *entitas*, bukan
 * peringkat. Warna tidak pernah sendirian membawa arti — selalu ada label,
 * legenda, atau tabel.
 *
 * Slot 1 (biru) → nilai uang · slot 2 (jingga) → jumlah · slot 3 (aqua) →
 * rata-rata/rasio.
 */
import {
  COLOR_COUNT,
  COLOR_MONEY,
  COLOR_RATE,
  SERIES_COLORS,
} from "./palette";

export { SERIES_COLORS, COLOR_COUNT, COLOR_MONEY, COLOR_RATE };

const SURFACE = "#ffffff";
const INK_MUTED = "#898781";
const INK_SECONDARY = "#52514e";
const GRID = "#e1e0d9";
const BASELINE = "#c3c2b7";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

if (typeof window !== "undefined") {
  const family = getComputedStyle(document.body).fontFamily;
  ChartJS.defaults.font.family = family || "system-ui, sans-serif";
  ChartJS.defaults.font.size = 11;
  ChartJS.defaults.color = INK_SECONDARY;
}

export type ChartSeries = {
  label: string;
  data: number[];
  color?: string;
};

export type ChartTable = {
  columns: string[];
  rows: (string | number)[][];
};

const moneyTick = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)} rb`;
  return `${sign}${Math.round(abs)}`;
};

const numberTick = (value: number) =>
  Math.abs(value) >= 1000
    ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1).replace(".", ",")}k`
    : String(value);

function baseOptions(
  options: {
    horizontal?: boolean;
    money?: boolean;
    legend?: boolean;
    stacked?: boolean;
    beginAtZero?: boolean;
  },
): ChartOptions<"bar" | "line"> {
  const valueScale = {
    beginAtZero: options.beginAtZero ?? true,
    grid: { color: GRID, drawTicks: false },
    border: { color: BASELINE },
    ticks: {
      color: INK_MUTED,
      padding: 6,
      callback: (value: string | number) =>
        options.money ? moneyTick(Number(value)) : numberTick(Number(value)),
    },
  };

  const categoryScale = {
    grid: { display: false },
    border: { color: BASELINE },
    ticks: { color: INK_MUTED, padding: 4, autoSkip: false },
  };

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        display: options.legend ?? false,
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          boxHeight: 8,
          padding: 14,
          color: INK_SECONDARY,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "#171717",
        titleColor: "#ffffff",
        bodyColor: "#f5f5f5",
        borderColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
      },
    },
    scales: {
      x: options.horizontal
        ? { ...valueScale, stacked: options.stacked }
        : { ...categoryScale, stacked: options.stacked },
      y: options.horizontal
        ? { ...categoryScale }
        : { ...valueScale, stacked: options.stacked },
    },
  } as ChartOptions<"bar" | "line">;
}

/** Grafik garis — untuk perubahan nilai dari waktu ke waktu. */
export function LineChart({
  labels,
  series,
  money = false,
  area = false,
  legend = false,
}: {
  labels: string[];
  series: ChartSeries[];
  money?: boolean;
  area?: boolean;
  legend?: boolean;
}) {
  const options = baseOptions({ money, legend }) as ChartOptions<"line">;
  return (
    <Line
      options={options}
      data={{
        labels,
        datasets: series.map((item, index) => ({
          label: item.label,
          data: item.data,
          borderColor: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length],
          backgroundColor: area
            ? `${item.color ?? SERIES_COLORS[index % SERIES_COLORS.length]}1f`
            : "transparent",
          fill: area,
          borderWidth: 2,
          tension: 0.28,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: SURFACE,
          pointBorderWidth: 2,
          pointBorderColor: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length],
        })),
      }}
    />
  );
}

/**
 * Grafik batang — untuk membandingkan besaran antar kategori.
 * `horizontal` dipakai saat labelnya panjang (judul buku, kategori).
 */
export function BarChart({
  labels,
  series,
  money = false,
  horizontal = false,
  stacked = false,
  legend = false,
}: {
  labels: string[];
  series: ChartSeries[];
  money?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  legend?: boolean;
}) {
  const options = baseOptions({ horizontal, money, stacked, legend }) as ChartOptions<"bar">;
  return (
    <Bar
      options={options}
      data={{
        labels,
        datasets: series.map((item, index) => ({
          label: item.label,
          data: item.data,
          backgroundColor: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length],
          borderColor: SURFACE,
          borderWidth: stacked ? 2 : 0,
          borderRadius: stacked
            ? 0
            : horizontal
              ? { topRight: 4, bottomRight: 4 }
              : { topLeft: 4, topRight: 4 },
          borderSkipped: false,
          maxBarThickness: horizontal ? 22 : 46,
        })),
      }}
    />
  );
}

/** Grafik donat — untuk komposisi dengan maksimal 3 kategori. */
export function DoughnutChart({
  labels,
  values,
  colors,
  money = false,
}: {
  labels: string[];
  values: number[];
  colors?: string[];
  money?: boolean;
}) {
  const palette = colors ?? SERIES_COLORS;
  return (
    <Doughnut
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              boxHeight: 8,
              padding: 14,
              color: INK_SECONDARY,
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: "#171717",
            padding: 10,
            cornerRadius: 8,
            usePointStyle: true,
            callbacks: {
              label: (item) => {
                const raw = Number(item.parsed);
                const text = money ? `Rp${moneyTick(raw)}` : numberTick(raw);
                return ` ${item.label}: ${text}`;
              },
            },
          },
        },
      }}
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: palette,
            borderColor: SURFACE,
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      }}
    />
  );
}
