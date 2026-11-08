import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/require-admin";
import UserRowActions from "@/components/admin/UserRowActions";
import Pagination from "@/components/Pagination";
import { clampPage, parsePage, parsePerPage } from "@/lib/pagination";
import PageLoader from "@/components/PageLoader";

export const metadata = {
  title: "User — Admin",
};

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; per?: string; q?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminUsersPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminUsersPageContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; per?: string; q?: string }>;
}) {
  await connection();

  const admin = await requireAdmin();
  if (!admin) return null;

  const sp = await searchParams;
  const perPage = parsePerPage(sp.per);
  const q = sp.q?.trim();

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.user.count({ where });
  const page = clampPage(parsePage(sp.page), total, perPage);

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      googleId: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  const dateFmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-black">User</h1>
          <p className="text-sm text-neutral-500">
            {total} akun terdaftar. Ubah role, reset password, atau nonaktifkan
            user.
          </p>
        </div>
        {/* Ekspor daftar user (W22) — CSV & Excel. */}
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/admin/export?report=users&format=csv"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Unduh CSV
          </a>
          <a
            href="/admin/export?report=users&format=xlsx"
            className="rounded-full bg-maroon-dark px-4 py-2 text-sm font-medium text-white"
          >
            Unduh Excel
          </a>
        </div>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari nama atau email user"
          aria-label="Cari user"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-maroon-dark px-5 py-2 text-sm font-medium text-white"
        >
          Cari
        </button>
        {q ? (
          <a href="/admin/users" className="text-sm text-neutral-500 underline">
            Reset
          </a>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Terakhir login</th>
              <th className="px-4 py-3 font-medium">Dibuat</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 text-neutral-800">{user.name}</td>
                <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-maroon/10 text-maroon"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {user.role}
                  </span>
                  {!user.isActive ? (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                      nonaktif
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {user.googleId ? "Google" : "Password"}
                </td>
                <td className="px-4 py-3 text-neutral-600">{user._count.orders}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {user.lastLoginAt ? dateFmt.format(user.lastLoginAt) : "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {dateFmt.format(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <UserRowActions
                    userId={user.id}
                    name={user.name}
                    role={user.role}
                    isActive={user.isActive}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        basePath="/admin/users"
        page={page}
        perPage={perPage}
        total={total}
        label="akun"
        params={q ? { q } : undefined}
      />
    </div>
  );
}
