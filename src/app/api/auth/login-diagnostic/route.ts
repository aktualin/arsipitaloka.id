import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { normalizeEmail } from "@/lib/email";

/**
 * Diagnostik login (rencana auth A15).
 *
 * Dipanggil SETELAH `signIn` gagal, untuk memberi tahu alasan yang spesifik:
 * akun terkunci sementara atau akun dinonaktifkan.
 *
 * Aturan privasi: jawaban hanya boleh membocorkan keadaan akun kalau password
 * yang diketik benar. Kalau email tidak dikenal atau password salah, balas
 * pesan generik yang sama persis — supaya halaman login tidak bisa dipakai
 * untuk menebak email yang punya akun.
 */
export async function POST(request: Request) {
  let email = "";
  let password = "";

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    email = normalizeEmail(typeof body.email === "string" ? body.email : null) ?? "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const generic = "Email atau password salah.";
  const user = await prisma.user.findUnique({ where: { email } });

  // Email tidak dikenal / akun tanpa password (dibuat lewat Google) /
  // password salah → jawaban generik yang sama.
  if (!user?.passwordHash) {
    return NextResponse.json({ message: generic }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ message: generic }, { status: 401 });
  }

  if (!user.isActive) {
    return NextResponse.json(
      { message: "Akun ini dinonaktifkan. Hubungi admin Arsip Pitaloka." },
      { status: 403 },
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.max(
      1,
      Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000),
    );
    return NextResponse.json(
      {
        message: `Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`,
      },
      { status: 423 },
    );
  }

  // Password benar dan tidak ada masalah — seharusnya `signIn` berhasil.
  return NextResponse.json({ message: generic }, { status: 401 });
}
