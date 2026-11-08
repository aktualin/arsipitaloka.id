"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  LayoutGrid,
  PanelsTopLeft,
  FileText,
  Newspaper,
  Music2,
  Video,
  ShoppingCart,
  Users,
  Settings,
  Image as ImageIcon,
  Mail,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ADMIN_MENU, type AdminMenuItem } from "@/lib/admin/entities";

/**
 * Tautan tambahan di dalam grup menu.
 *
 * `ADMIN_MENU` (di `entities.ts`) adalah sumber utama menu admin; tautan
 * utilitas yang bukan entitas CRUD (mis. import CSV) ditambahkan di sini
 * supaya daftar entitas tetap satu sumber kebenaran.
 */
const ADMIN_MENU_EXTRA: Record<string, { href: string; label: string }[]> = {
  "Toko E-Book": [{ href: "/admin/book/import", label: "Import Buku (CSV)" }],
};

const ICONS = {
  LayoutDashboard,
  BookOpen,
  LayoutGrid,
  PanelsTopLeft,
  FileText,
  Newspaper,
  Music2,
  Video,
  ShoppingCart,
  Users,
  Settings,
  Image: ImageIcon,
  Mail,
} as const;

type IconName = keyof typeof ICONS;

const isDataUrl = (value: string) => value.startsWith("data:");

/**
 * Bandingkan href child (bisa mengandung query `?platform=`) dengan lokasi
 * sekarang. `/admin/social` (Semua) hanya aktif bila TIDAK ada `platform`,
 * sehingga tidak ikut menyala saat `/admin/social?platform=youtube`.
 */
function childActive(
  href: string,
  pathname: string,
  platform: string | null,
): boolean {
  const [path, query] = href.split("?");
  if (pathname !== path) return false;
  const wantPlatform = query
    ? new URLSearchParams(query).get("platform")
    : null;
  return (platform ?? null) === (wantPlatform ?? null);
}

export default function AdminNav({
  name,
  email,
  image,
  logoUrl,
}: {
  name: string;
  email: string;
  image: string | null;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform");
  const initial = (name || "P").trim().charAt(0).toUpperCase();
  const brandLogo = logoUrl || "/images/logo-pitaloka.png";

  /** Sidebar dibuka/tutup — responsif: mobile drawer (fixed overlay), desktop always-visible. */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tutup sidebar ketika viewport melebar → switch dari drawer ke always-visible layout.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    if (mq.matches) setSidebarOpen(true);
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(true);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <>
      {/* Tombol hamburger — tampil hanya pada layar kecil (mobile / tablet portrait). */}
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        className="fixed right-3 top-3 z-40 rounded bg-white p-2 shadow lg:hidden"
        aria-label="Toggle navigasi admin"
      >
        {sidebarOpen ? (
          <X size={20} className="text-maroon-dark" />
        ) : (
          <Menu size={20} className="text-maroon-dark" />
        )}
      </button>

      {/* Backdrop gelap untuk drawer — HANYA di mobile saat sidebar terbuka.
          `lg:hidden` memastikan tidak pernah muncul di desktop (tempat sidebar
          selalu tampil statis), tanpa inline style yang menimpa kelas responsif. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar drawer — mobile: fixed overlay (slide-in/out); desktop: static panel. */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-full w-64 shrink-0 flex-col overflow-y-auto bg-maroon-dark text-white transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Brand */}
      <div className="px-5 py-6">
        <Image
          src={brandLogo}
          alt="Logo Pitaloka"
          width={160}
          height={48}
          unoptimized={isDataUrl(brandLogo)}
          className="h-9 w-auto object-contain"
        />
        <span className="mt-2 block truncate text-xs text-white/50">
          Dashboard
        </span>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {ADMIN_MENU.map((item) =>
          item.children ? (
            <MenuGroup
              key={item.label}
              item={item}
              pathname={pathname}
              platform={platform}
            />
          ) : (
            <MenuLeaf
              key={item.href}
              href={item.href!}
              label={item.label}
              icon={item.icon}
              pathname={pathname}
            />
          ),
        )}
      </nav>

      {/* Akun */}
      <div className="border-t border-white/10 px-5 py-5">
        <Link
          href="/admin/akun"
          className="flex items-center gap-3 rounded-lg p-1 transition hover:bg-white/10"
        >
          {image ? (
            <Image
              src={image}
              alt={name}
              width={40}
              height={40}
              unoptimized={isDataUrl(image)}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
              {initial}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-white/50">{email}</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-4 flex w-full items-center gap-3 rounded-lg px-1 py-2 text-sm text-white/70 transition hover:text-white"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
    </>
  );
}

function MenuLeaf({
  href,
  label,
  icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: string;
  pathname: string;
}) {
  const active =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const Icon = ICONS[icon as IconName];

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        active
          ? "bg-white/15 font-semibold text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {Icon ? <Icon size={17} className="shrink-0" /> : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function MenuGroup({
  item,
  pathname,
  platform,
}: {
  item: AdminMenuItem;
  pathname: string;
  platform: string | null;
}) {
  const children = [
    ...(item.children ?? []),
    ...(ADMIN_MENU_EXTRA[item.label] ?? []),
  ];
  const anyChildActive = children.some((c) =>
    childActive(c.href, pathname, platform),
  );
  // Auto-buka bila salah satu child aktif; sisanya dikendalikan state.
  const [open, setOpen] = useState(anyChildActive);
  const expanded = open || anyChildActive;
  const Icon = ICONS[item.icon as IconName];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
          anyChildActive
            ? "font-semibold text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          {Icon ? <Icon size={17} className="shrink-0" /> : null}
          <span className="truncate">{item.label}</span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          } opacity-70`}
        />
      </button>

      {expanded ? (
        <div className="mt-1 space-y-1 pl-9">
          {children.map((child) => {
            const active = childActive(child.href, pathname, platform);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/15 font-semibold text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
