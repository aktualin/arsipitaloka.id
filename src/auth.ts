import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { normalizeEmail } from "@/lib/email";
import { isGoogleAuthEnabled } from "@/lib/auth-config";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Durasi session (rencana auth A17) — "Remember me" Centang atau tidak. */
const SESSION_LONG = 60 * 60 * 24 * 30; // 30 hari
const SESSION_SHORT = 60 * 60 * 24; // 1 hari

// Google hanya didaftarkan kalau kredensialnya benar-benar ada.
// Kalau tidak, provider-nya akan gagal dengan "InvalidClient" saat dipakai.
const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      // `credentials` bertipe `unknown` per field — ambil string dengan type-guard.
      const rawEmail = credentials?.email;
      const rawPassword = credentials?.password;
      const email = normalizeEmail(
        typeof rawEmail === "string" ? rawEmail : null,
      );
      const password = typeof rawPassword === "string" ? rawPassword : "";
      if (!email || !password) return null;

      // "Remember me" (rencana auth A17) — dikirim dari form login.
      const remember =
        String((credentials as Record<string, unknown> | undefined)?.remember ?? "") ===
        "1";

      const user = await prisma.user.findUnique({ where: { email } });
      // passwordHash null → akun dibuat lewat Google, tidak bisa login via password
      if (!user?.passwordHash) return null;
      if (!user.isActive) return null;
      if (user.lockedUntil && user.lockedUntil > new Date()) return null;

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        const failed = user.failedAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: failed,
            lockedUntil:
              failed >= MAX_FAILED_ATTEMPTS
                ? new Date(Date.now() + LOCK_MINUTES * 60_000)
                : null,
          },
        });
        return null;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        // Ditangkap callback `jwt` untuk menentukan masa berlaku session.
        remember,
      };
    },
    }),
];

if (isGoogleAuthEnabled()) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = normalizeEmail(user.email);
      const googleId =
        typeof profile?.sub === "string" ? profile.sub : null;
      if (!email || !googleId) return false;

      const existing = await prisma.user.findUnique({ where: { email } });

      if (!existing) {
        await prisma.user.create({
          data: {
            email,
            name: user.name ?? email.split("@")[0],
            image: user.image,
            googleId,
            emailVerified: new Date(),
            passwordHash: null, // akun ini hanya lewat Google
            role: "CUSTOMER",
          },
        });
        return true;
      }

      if (!existing.isActive) return false;

      if (!existing.googleId) {
        // Email sama tapi belum pernah pakai Google → tautkan akun
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId,
            emailVerified: existing.emailVerified ?? new Date(),
            image: user.image ?? existing.image,
          },
        });
        return true;
      }

      // Email dipakai akun Google lain → tolak
      return existing.googleId === googleId;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        // ambil role terbaru dari DB (bukan dari claim lama)
        const dbUser = await prisma.user.findUnique({
          where: { id: String(user.id) },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "CUSTOMER";

        // Masa berlaku session mengikuti pilihan "Remember me" (A17).
        const remember =
          (user as unknown as { remember?: boolean }).remember === true;
        token.exp = Math.floor(
          Date.now() / 1000 + (remember ? SESSION_LONG : SESSION_SHORT),
        );
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = token.role ?? "CUSTOMER";
      }
      return session;
    },
  },
});
