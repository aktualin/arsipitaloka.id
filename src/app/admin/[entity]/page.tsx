import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getEntity } from "@/lib/admin/entities";
import { getDelegate } from "@/lib/admin/delegates";
import EntityTable from "@/lib/admin/table";
import EntityForm from "@/components/admin/EntityForm";
import Pagination from "@/components/Pagination";
import { clampPage, parsePage, parsePerPage } from "@/lib/pagination";
import type { FieldDef } from "@/lib/admin/entities";
import PageLoader from "@/components/PageLoader";

/**
 * Ubah nilai yang tidak bisa diserialisasi ke Client Component:
 * Prisma `Decimal` → string. (Date & tipe plain lain aman dikirim.)
 */
function serializeRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Date aman dikirim ke Client Component, tetapi Prisma Decimal tidak.
      // Decimal.js dikenali dari method `toFixed`; ubah jadi string.
      if (typeof (value as { toFixed?: unknown }).toFixed === "function") {
        out[key] = (value as { toString(): string }).toString();
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

type EntitySearchParams = {
  edit?: string;
  create?: string;
  page?: string;
  per?: string;
  q?: string;
  platform?: string;
  type?: string;
};

export default function AdminEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<EntitySearchParams>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminEntityPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminEntityPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<EntitySearchParams>;
}) {
  await connection();

  const admin = await requireAdmin();
  // `notFound()` TIDAK boleh dipakai di sini: halaman ini berada di dalam
  // <Suspense> milik layout admin, dan lemparan error di dalam boundary itu
  // membuat route merespons 200 dengan shell kosong (halaman 404 tidak pernah
  // terkirim). Pakai `redirect()` saja.
  if (!admin) redirect("/login?callbackUrl=/admin");

  const { entity } = await params;
  const def = getEntity(entity);
  // Entitas tidak dikenal (mis. URL lama /admin/laporan) → kembali ke dashboard.
  if (!def) redirect("/admin");

  const delegate = getDelegate(def.model);
  if (!delegate) redirect("/admin");

  const sp = await searchParams;
  const editId = sp.edit ?? null;

  // Prisma memakai { [field]: dir }, bukan { field, dir }.
  const orderBy = def.orderBy
    ? { [def.orderBy.field]: def.orderBy.dir }
    : undefined;

  // Pagination: minimal 5 baris per halaman.
  const perPage = parsePerPage(sp.per);

  // Pencarian generik: cocokkan field judul entitas (dan penulis untuk buku).
  const q = sp.q?.trim();
  const hasAuthor = def.fields.some((field) => field.name === "author");

  // Filter platform (mis. /admin/social?platform=youtube) hanya berlaku untuk
  // entitas yang punya field `platform` — nilainya dibatasi ke daftar sah.
  const hasPlatform = def.fields.some((field) => field.name === "platform");
  const platform =
    hasPlatform &&
    sp.platform &&
    ["tiktok", "youtube", "instagram"].includes(sp.platform)
      ? sp.platform
      : undefined;

  // Filter kanal artikel (mis. /admin/article?type=blog).
  const hasType = def.fields.some((field) => field.name === "type");
  const type =
    hasType &&
    sp.type &&
    ["berita-terkini", "blog", "umkm"].includes(sp.type)
      ? sp.type
      : undefined;

  const conditions: Record<string, unknown>[] = [];
  if (q) {
    conditions.push({
      OR: [
        { [def.titleField]: { contains: q, mode: "insensitive" } },
        ...(hasAuthor
          ? [{ author: { contains: q, mode: "insensitive" } }]
          : []),
      ],
    });
  }
  if (platform) {
    conditions.push({ platform });
  }
  if (type) {
    conditions.push({ type });
  }
  const where = conditions.length > 0 ? { AND: conditions } : {};

  // Parameter yang harus dibawa saat pindah halaman / submit pencarian.
  const carryParams: Record<string, string> = {};
  if (q) carryParams.q = q;
  if (platform) carryParams.platform = platform;
  if (type) carryParams.type = type;

  const total = await delegate.count({ where });
  const page = clampPage(parsePage(sp.page), total, perPage);

  const rows: Record<string, unknown>[] = await delegate.findMany({
    where,
    orderBy,
    skip: (page - 1) * perPage,
    take: perPage,
  });

  // Isi opsi select yang sumbernya entitas lain (mis. tab konten untuk buku).
  const fields: FieldDef[] = [];
  const categoryOptions: {
    value: string;
    label: string;
    icon: string | null;
  }[] = [];

  for (const field of def.fields) {
    if (!field.source) {
      fields.push(field);
      continue;
    }
    const sourceDef = getEntity(field.source.entity);
    const sourceDelegate = sourceDef ? getDelegate(sourceDef.model) : undefined;

    // Field kategori butuh ikon juga supaya bisa ditampilkan sebagai kartu.
    const select =
      field.type === "category"
        ? { id: true, name: true, icon: true }
        : { id: true, [field.source.labelField]: true };

    const sourceRows: Record<string, unknown>[] = sourceDelegate
      ? await sourceDelegate.findMany({
          select,
          orderBy: sourceDef?.orderBy
            ? { [sourceDef.orderBy.field]: sourceDef.orderBy.dir }
            : undefined,
        })
      : [];

    if (field.type === "category") {
      for (const row of sourceRows) {
        categoryOptions.push({
          value: String(row.id),
          label: String(row.name),
          icon: row.icon ? String(row.icon) : null,
        });
      }
    }

    fields.push({
      ...field,
      options: sourceRows.map((row) => ({
        value: String(row.id),
        label: String(
          field.type === "category" ? row.name : row[field.source!.labelField],
        ),
      })),
    });
  }

  // Baris yang sedang diedit boleh berada di halaman lain → ambil terpisah.
  const editingRaw = editId
    ? ((await delegate.findUnique({ where: { id: editId } })) as Record<
        string,
        unknown
      > | null)
    : null;

  // Prisma Decimal tidak bisa dikirim ke Client Component → ubah jadi string.
  const editing = editingRaw ? serializeRow(editingRaw) : null;

  const creating = sp.create === "1";
  // Nilai default untuk form tambah (mis. kanal artikel dari URL).
  const createDefaults: Record<string, unknown> = {};
  if (type) createDefaults.type = type;

  const backHref =
    Object.keys(carryParams).length > 0
      ? `/admin/${def.key}?${new URLSearchParams(carryParams).toString()}`
      : `/admin/${def.key}`;

  // Point #9: tambah / ubah dibuka sebagai halaman tersendiri (URL berbeda).
  if (editing || creating) {
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
        >
          <ArrowLeft size={16} /> Kembali ke daftar {def.label.toLowerCase()}
        </Link>
        <header>
          <h1 className="font-heading text-2xl font-bold text-black">
            {editing ? `Ubah ${def.singular}` : `Tambah ${def.singular}`}
          </h1>
        </header>
        <EntityForm
          def={def}
          fields={fields}
          values={editing ?? createDefaults}
          id={editing ? String(editing.id) : null}
          categoryOptions={categoryOptions}
        />
      </div>
    );
  }

  const createHref =
    Object.keys(carryParams).length > 0
      ? `/admin/${def.key}?${new URLSearchParams({ ...carryParams, create: "1" }).toString()}`
      : `/admin/${def.key}?create=1`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-black">{def.label}</h1>
          <p className="text-sm text-neutral-500">
            Kelola data {def.label.toLowerCase()} — perubahan langsung tampil di situs.
          </p>
        </div>
        {def.canCreate !== false ? (
          <Link
            href={createHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-maroon-dark px-4 py-2 text-sm font-medium text-white"
          >
            <Plus size={16} /> Tambah {def.singular}
          </Link>
        ) : null}
      </header>

      <EntityTable def={def} fields={fields} rows={rows} />

      <form method="get" className="flex flex-wrap items-center gap-3">
        {platform ? (
          <input type="hidden" name="platform" value={platform} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={`Cari ${def.label.toLowerCase()}…`}
          aria-label={`Cari ${def.label.toLowerCase()}`}
          className="min-h-10 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:w-64"
        />
        <button
          type="submit"
          className="rounded-full bg-maroon-dark px-5 py-2 text-sm font-medium text-white"
        >
          Cari
        </button>
        {q ? (
          <a
            href={
              platform
                ? `/admin/${def.key}?platform=${platform}`
                : `/admin/${def.key}`
            }
            className="text-sm text-neutral-500 underline"
          >
            Reset
          </a>
        ) : null}
      </form>

      <Pagination
        basePath={`/admin/${def.key}`}
        page={page}
        perPage={perPage}
        total={total}
        label={def.label.toLowerCase()}
        params={
          Object.keys(carryParams).length > 0 ? carryParams : undefined
        }
      />
    </div>
  );
}
