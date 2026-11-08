"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { sanitizeCallbackUrl } from "@/lib/callback-url";
import { AMBER, CheckBox, Field, PasswordField, SubmitButton } from "./fields";
import Spinner from "@/components/Spinner";

/**
 * Minta alasan kegagalan login yang lebih spesifik (rencana auth A15):
 * akun terkunci sementara atau akun dinonaktifkan.
 *
 * Endpoint diagnosa hanya membocorkan keadaan akun kalau password-nya benar,
 * jadi halaman login tetap tidak bisa dipakai menebak email terdaftar.
 */
async function diagnoseLoginFailure(
  email: string,
  password: string,
): Promise<string> {
  const generic = "Email atau password salah.";
  try {
    const response = await fetch("/api/auth/login-diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as { message?: string };
    return data.message || generic;
  } catch {
    return generic;
  }
}

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  // `callbackUrl` dibaca di client, bukan lewat `searchParams` server-side:
  //-awaiting `searchParams` di page membuat route tidak bisa di-prerender
  // (cacheComponents), dan `useSearchParams` butuh <Suspense> yang akan
  // membuat form hanya ter-render di client.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("callbackUrl");
    const safe = sanitizeCallbackUrl(raw);
    // Kalau tidak ada callbackUrl eksplisit, pembeli diarahkan ke pustakanya
    // (/akun) dan admin ke dashboard — bukan ke beranda.
    setCallbackUrl(safe === "/" ? null : safe);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    // "Remember me" menentukan masa berlaku session (rencana auth A17).
    const remember = form.get("remember") ? "1" : "0";

    const result = await signIn("credentials", {
      email,
      password,
      remember,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError(await diagnoseLoginFailure(email, password));
      return;
    }

    let target = callbackUrl;

    if (!target) {
      const session = await getSession();
      target = session?.user?.role === "ADMIN" ? "/admin" : "/akun";
    }

    router.push(target ?? "/");
    router.refresh();
  }

  return (
    <form className="mt-[39px] sm:mt-10" onSubmit={handleSubmit}>
      <Field
        type="email"
        name="email"
        placeholder="Email address"
        autoComplete="email"
        required
        inputClassName="py-3 text-sm active:bg-white focus:ring-maroon"
      />
      <div className="mt-[24px]">
        <PasswordField
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          inputClassName="py-3 text-sm active:bg-white focus:ring-maroon"
        />
      </div>

      <div className="mt-[29px] flex items-center justify-between">
        {/* "Remember me" ada di desain — sekarang benar-benar affects masa
            berlaku session: 30 hari bila dicentang, 1 hari bila tidak
            (rencana auth A17). */}
        <CheckBox label="Remember me" name="remember" value="1" defaultChecked />
        <Link
          href="/forgot-password"
          className="inline-flex min-h-9 items-center text-[15px]"
          style={{ color: AMBER }}
        >
          Fotget password
        </Link>
      </div>

      <div className="mt-[20px]">
        <SubmitButton disabled={pending}>
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size={18} /> Login
            </span>
          ) : (
            "Login"
          )}
        </SubmitButton>
      </div>

      {error ? (
        <p className="mt-[12px] text-center text-[14px] text-[#c0392b]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
