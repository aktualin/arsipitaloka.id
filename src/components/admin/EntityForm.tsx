"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { saveEntity, deleteEntity } from "@/lib/admin/actions";
import { slugify } from "@/lib/slug";
import { previewPathForEntity } from "@/lib/admin/preview";
import type { FieldDef, EntityDef } from "@/lib/admin/entities";
import ImageField from "./ImageField";
import IconPicker from "./IconPicker";
import TikTokField from "./TikTokField";
import SocialField from "./SocialField";
import CategoryPicker, { type CategoryOption } from "./CategoryPicker";
import RichTextField from "./RichTextField";

type Props = {
  def: EntityDef;
  fields: FieldDef[];
  values?: Record<string, unknown>;
  id?: string | null;
  /** Opsi kategori (dengan ikon) untuk field bertipe "category". */
  categoryOptions?: CategoryOption[];
};

function toInputValue(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "1" : "";
  if (typeof value === "string" && Array.isArray(value)) return "";
  if (Array.isArray(value)) return value.join("\n");
  return value as string | number;
}

type UploadMeta = {
  url: string;
  size?: number;
  format?: string;
  words?: number;
  pages?: number;
};

export default function EntityForm({
  def,
  fields,
  values = {},
  id = null,
  categoryOptions = [],
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    saveEntity.bind(null, def.key, id),
    { ok: false, message: "" },
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Setelah simpan sukses, kembali ke daftar (tambah/ubah dibuka sebagai
  // halaman tersendiri — point #9).
  useEffect(() => {
    if (state.ok) {
      router.push(`/admin/${def.key}`);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  // Nilai untuk kolom otomatis (format/ukuran/jumlah kata/halaman/rating).
  const [autoValues, setAutoValues] = useState<Record<string, string | number>>(
    () => {
      const initial: Record<string, string | number> = {};
      for (const field of fields) {
        if (!field.auto && !field.autoFrom) continue;
        const current = values[field.name];
        if (current !== undefined && current !== null && current !== "") {
          initial[field.name] = current as string | number;
        } else if (field.defaultValue !== undefined) {
          initial[field.name] = field.defaultValue;
        } else {
          initial[field.name] = "";
        }
      }
      return initial;
    },
  );

  // Slug dibuat otomatis dari field sumber (mis. "title" → slug).
  const slugField = useMemo(
    () => fields.find((field) => field.slugFrom),
    [fields],
  );
  const [slugValue, setSlugValue] = useState<string>(() =>
    slugField ? String(values[slugField.name] ?? "") : "",
  );
  const [slugTouched, setSlugTouched] = useState(false);

  function handleUploaded(meta: UploadMeta) {
    setAutoValues((prev) => {
      const next = { ...prev };
      for (const field of fields) {
        if (!field.autoFrom) continue;
        if (field.autoFrom === "format" && meta.format) {
          next[field.name] = meta.format;
        }
        if (field.autoFrom === "size" && typeof meta.size === "number") {
          next[field.name] = meta.size;
        }
        if (field.autoFrom === "words" && typeof meta.words === "number") {
          next[field.name] = meta.words;
        }
        if (field.autoFrom === "pages" && typeof meta.pages === "number") {
          next[field.name] = meta.pages;
        }
      }
      return next;
    });
  }

  const categoryOptions2 = categoryOptions;

  // Tautan pratinjau: halaman publik konten dengan `?preview=1` supaya
  // admin bisa melihat tampilannya persis seperti pengunjung — termasuk
  // kalau kontennya belum tayang. Hanya entitas yang punya halaman detail
  // publik yang punya tautan ini.
  const previewHref = useMemo(
    () => (id ? previewPathForEntity(def.key, values) : null),
    [def.key, id, values],
  );

  return (
    <form action={action} className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-black">
          {id ? `Ubah ${def.singular}` : `Tambah ${def.singular}`}
        </h2>
        <div className="flex items-center gap-3">
          {previewHref ? (
            <Link
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka halaman publik konten ini dalam mode pratinjau"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <ExternalLink size={14} aria-hidden />
              Pratinjau
            </Link>
          ) : null}
          {id ? (
            <button
              type="button"
              onClick={() => router.push(`/admin/${def.key}`)}
              className="text-sm text-neutral-500 hover:text-neutral-800"
            >
              Batal
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const error = state.fieldErrors?.[field.name];
          const raw = values[field.name];
          // Kolom dengan nilai bawaan (mis. "order") tetap terisi walau form kosong.
          const initial = toInputValue(raw);
          const initialValue =
            initial === "" && field.defaultValue !== undefined
              ? field.defaultValue
              : initial;

          if (field.type === "boolean") {
            return (
              <label key={field.name} className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="hidden" name={field.name} value="0" />
                <input
                  type="checkbox"
                  name={field.name}
                  value="1"
                  defaultChecked={raw === true}
                  className="h-4 w-4 accent-[#3a1012]"
                />
                {field.label}
              </label>
            );
          }

          // Kolom otomatis: nilainya diisi dari file yang diunggah.
          if (field.auto || field.autoFrom) {
            const value = autoValues[field.name] ?? "";
            const display =
              field.autoFrom === "size"
                ? value
                  ? `${value} byte`
                  : "—"
                : field.autoFrom === "words"
                  ? value
                    ? `${value} kata`
                    : "—"
                  : field.autoFrom === "pages"
                    ? value
                      ? `${value} halaman`
                      : "—"
                    : value || "—";
            return (
              <div key={field.name}>
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  {field.label}
                </span>
                <input type="hidden" name={field.name} value={String(value)} />
                <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                  {display}
                  <span className="ml-2 text-xs text-neutral-400">(otomatis)</span>
                </div>
                {field.help ? (
                  <p className="mt-1 text-xs text-neutral-500">{field.help}</p>
                ) : null}
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "image" || field.type === "file") {
            return (
              <div key={field.name} className="md:col-span-2">
                <ImageField
                  name={field.name}
                  label={field.label}
                  kind={field.type}
                  value={(raw as string) ?? null}
                  help={field.help}
                  onUploaded={handleUploaded}
                />
              </div>
            );
          }

          if (field.type === "icon") {
            return (
              <div key={field.name} className="md:col-span-2">
                <IconPicker
                  name={field.name}
                  label={field.label}
                  value={(raw as string) ?? null}
                  help={field.help}
                />
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "tiktok") {
            return (
              <div key={field.name} className="md:col-span-2">
                <TikTokField
                  name={field.name}
                  label={field.label}
                  value={(raw as string) ?? null}
                  help={field.help}
                />
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "social") {
            return (
              <div key={field.name} className="md:col-span-2">
                <SocialField
                  name={field.name}
                  label={field.label}
                  value={(raw as string) ?? null}
                  help={field.help}
                />
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "category") {
            return (
              <div key={field.name} className="md:col-span-2">
                <CategoryPicker
                  name={field.name}
                  label={field.label}
                  options={categoryOptions2}
                  value={(raw as string) ?? null}
                  help={field.help}
                />
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "richtext") {
            return (
              <div key={field.name} className="md:col-span-2">
                <RichTextField
                  name={field.name}
                  label={field.label}
                  value={(raw as string) ?? null}
                  help={field.help}
                />
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "textarea" || field.type === "lines") {
            return (
              <div key={field.name} className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {field.label}
                </label>
                <textarea
                  name={field.name}
                  defaultValue={toInputValue(raw)}
                  required={field.required}
                  placeholder={field.placeholder}
                  rows={field.type === "lines" ? 5 : 3}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
                />
                {field.help ? (
                  <p className="mt-1 text-xs text-neutral-500">{field.help}</p>
                ) : null}
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div key={field.name}>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {field.label}
                </label>
                <select
                  name={field.name}
                  defaultValue={toInputValue(raw)}
                  required={field.required}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none"
                >
                  <option value="">— pilih —</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          // Slug: diisi otomatis dari field sumber.
          if (field.slugFrom) {
            const sourceValue = String(values[field.slugFrom] ?? "");
            return (
              <div key={field.name}>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {field.label}
                </label>
                <input
                  type="text"
                  name={field.name}
                  value={slugValue}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlugValue(e.target.value);
                  }}
                  onBlur={() => {
                    if (!slugTouched) {
                      const next = slugify(slugValue || sourceValue);
                      if (next) setSlugValue(next);
                    }
                  }}
                  placeholder={slugify(sourceValue) || "otomatis dari judul"}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
                />
                {field.help ? (
                  <p className="mt-1 text-xs text-neutral-500">{field.help}</p>
                ) : null}
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
            );
          }

          return (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {field.label}
              </label>
              <input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                name={field.name}
                step={field.step}
                defaultValue={initialValue}
                required={field.required}
                placeholder={field.placeholder}
                onChange={
                  slugField && field.name === slugField.slugFrom && !slugTouched
                    ? (e) => {
                        const next = slugify(e.target.value);
                        setSlugValue(next);
                      }
                    : undefined
                }
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
              />
              {field.help ? (
                <p className="mt-1 text-xs text-neutral-500">{field.help}</p>
              ) : null}
              {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
            </div>
          );
        })}
      </div>

      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-maroon-dark px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>

        {id ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-600"
            >
              Hapus
            </button>
            {confirmOpen ? (
              <span className="flex items-center gap-2 text-sm">
                Yakin hapus {def.singular} ini?
                <button
                  type="button"
                  onClick={async () => {
                    const res = await deleteEntity(def.key, id!);
                    setConfirmOpen(false);
                    if (res.ok) router.push(`/admin/${def.key}`);
                    else alert(res.message);
                  }}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white"
                >
                  Ya, hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="text-xs text-neutral-500"
                >
                  Batal
                </button>
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </form>
  );
}
