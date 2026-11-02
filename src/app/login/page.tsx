import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
// Login Google dinonaktifkan — lihat blok SocialButtons di bawah.
// import { isGoogleAuthEnabled } from "@/lib/auth-config";
import SiteHeader from "@/components/layout/SiteHeader";
import {
  AMBER,
  Heading,
  LogoMark,
  // OrDivider,
  // SocialButtons,
  SubText,
} from "@/components/auth/fields";
import { buildMetadata } from "@/lib/seo";

/** Halaman auth tidak boleh diindeks sama sekali. */
export const metadata = buildMetadata({
  title: "Masuk",
  description:
    "Masuk ke akun Arsip Pitaloka untuk akses pustaka digital, e-book, dan riwayat pembelian Anda.",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <AuthShell
        image="/images/auth-login.jpg"
        alt="Perbukitan dan sawah terasering"
        imagePercent={54.9}
        contentLeft={75.5}
        contentRight={85.9}
        contentTop={218.9}
      >
        <LogoMark />

        <div className="mt-[19px]">
          <Heading>Welcome back</Heading>
        </div>
        <div className="mt-[19px]">
          <SubText>Welcome back, please enter your detail</SubText>
        </div>

        {/* Login dengan Google dinonaktifkan sementara.
        <div className="mt-[37px]">
          <SocialButtons googleEnabled={isGoogleAuthEnabled()} />
        </div>
        <div className="mt-[29px]">
          <OrDivider />
        </div>
        */}

        <div className="mt-[37px]" />

        <LoginForm />

        <p className="mt-[24px] text-center text-[15px] text-[#606261]">
          Not registered yet?{" "}
          <Link href="/register" style={{ color: AMBER }}>
            Create an account
          </Link>
        </p>
      </AuthShell>
    </>
  );
}
