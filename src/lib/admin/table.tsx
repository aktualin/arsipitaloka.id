import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { EntityDef, FieldDef } from "./entities";
import { sortableFields } from "./entities";
import { previewPathForEntity } from "./preview";
import ConfirmButton from "@/components/admin/ConfirmButton";

function formatCell(value: unknown, field: FieldDef): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "boolean") return value ? "Ya" : "Tidak";
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value);
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** Susun query string dari parameter pembawa (filter, urutan, dll). */
function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    search.set(key, value);
  }
  return search.toString();
}

/**
 * Link header kolom — klik mengurutkan berdasarkan kolom itu.
 * Klik pada kolom yang sama membalik arah (asc → desc → asc).
 */
function sortHref(
  basePath: string,
  params: Record<string, string | undefined>,
  field: string,
  current: { field: string; dir: "asc" | "desc" } | null,
): string {
  const next: Record<string, string | undefined> = { ...params };
  delete next.sort;
  delete next.dir;
  delete next.page;
  next.sort = field;
  next.dir = current?.field === field && current.dir === "asc" ? "desc" : "asc";
  return `${basePath}?${buildQuery(next)}`;
}

/** Tombol aksi tabel — ukuran touch-target ≥48px di layar kecil untuk aksesibilitas mobile. */
function ActionButtons({
  entityKey,
  id,
  editHref,
  previewHref,
}: {
  entityKey: string;
  id: string;
  editHref: string;
  previewHref?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {previewHref ? (
        <a
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 active:scale-95 sm:py-1"
        >
          Pratinjau
        </a>
      ) : null}
      <Link
        href={editHref}
        className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 active:scale-95 sm:py-1"
      >
        Ubah
      </Link>
      <ConfirmButton entityKey={entityKey} id={id} />
    </div>
  );
}

export default function EntityTable({
  def,
  fields,
  rows,
  basePath,
  params = {},
  sort = null,
  selectable = false,
}: {
  def: EntityDef;
  fields: FieldDef[];
  rows: Record<string, unknown>[];
  /** Path daftar entitas — dipakai untuk link header (urutan) dan link ubah. */
  basePath: string;
  /** Parameter yang harus ikut dibawa (filter, urutan aktif, dll). */
  params?: Record<string, string | undefined>;
  /** Kolom & arah urut yang sedang aktif. */
  sort?: { field: string; dir: "asc" | "desc" } | null;
  /** Tampilkan kolom checkbox untuk bulk action. */
  selectable?: boolean;
}) {
  const listFields = fields.filter((f) => f.list);
  const sortable = new Set(sortableFields(def));
  const extraColumns = selectable ? 1 : 0;

  return (
    <div>
      {/* Di layar kecil tabel lebih lebar dari layar → digeser horizontal.
          Petunjuk ini supaya pengguna tahu kolomnya ada di sebelah kanan. */}
      <p className="mb-2 text-xs text-neutral-500 sm:hidden">
        Geser tabel ke samping untuk melihat semua kolom.
      </p>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] uppercase tracking-wide text-neutral-500 sm:text-xs">
            <tr>
              {selectable ? (
                <th scope="col" className="w-10 px-3 py-3 font-medium sm:px-4 sm:py-3">
                  <span className="sr-only">Pilih</span>
                </th>
              ) : null}
              {listFields.map((f) => {
                const active = sort?.field === f.name;
                const isSortable = sortable.has(f.name);
                return (
                  <th
                    key={f.name}
                    scope="col"
                    aria-sort={
                      active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className="px-3 py-3 font-medium sm:px-4 sm:py-3"
                  >
                    {isSortable ? (
                      <Link
                        href={sortHref(basePath, params, f.name, sort)}
                        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-neutral-800"
                        title={`Urutkan berdasarkan ${f.label}`}
                      >
                        {f.label}
                        {active ? (
                          sort.dir === "asc" ? (
                            <ArrowUp size={13} aria-hidden />
                          ) : (
                            <ArrowDown size={13} aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown size={13} aria-hidden className="opacity-40" />
                        )}
                      </Link>
                    ) : (
                      f.label
                    )}
                  </th>
                );
              })}
              <th className="px-3 py-3 font-medium sm:px-4 sm:py-3">Aksi</th>
            </tr>
          </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={listFields.length + 1 + extraColumns}
                className="px-4 py-8 text-center text-neutral-500"
              >
                Belum ada data.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = String(row.id);
              const editParams = { ...params };
              delete editParams.page;
              const editQuery = buildQuery(editParams);
              return (
                <tr key={id} className="border-b border-neutral-100 last:border-0">
                  {selectable ? (
                    <td className="px-3 py-3 align-middle sm:px-4">
                      <input
                        type="checkbox"
                        name="ids"
                        value={id}
                        aria-label={`Pilih ${def.singular} ${id}`}
                        className="h-4 w-4 rounded border-neutral-300 accent-maroon-dark"
                      />
                    </td>
                  ) : null}
                  {listFields.map((f) => (
                    <td
                      key={f.name}
                      className="whitespace-normal break-words px-3 py-3 align-middle text-neutral-800 sm:px-4"
                    >
                      <span className="line-clamp-2">
                        {formatCell(row[f.name], f)}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-3 sm:px-4">
                    <ActionButtons
                      entityKey={def.key}
                      id={id}
                      previewHref={previewPathForEntity(def.key, row)}
                      editHref={
                        editQuery
                          ? `${basePath}?${editQuery}&edit=${id}`
                          : `${basePath}?edit=${id}`
                      }
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
