import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SiteHeader from "@/components/layout/SiteHeader";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Heading, LogoMark, SubText } from "@/components/auth/fields";
import { buildMetadata } from "@/lib/seo";

/** Halaman auth tidak boleh diindeks sama sekali. */
export const metadata = buildMetadata({
  title: "Lupa Password",
  description:
    "Atur ulang kata sandi akun Arsip Pitaloka melalui kode OTP yang dikirim ke surel Anda.",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <AuthShell
        image="/images/auth-forgot.jpg"
        alt="Gunung dan persawahan"
        imagePercent={53.2}
        contentLeft={95}
        contentRight={99.1}
        contentTop={362.9}
      >
        <LogoMark ring />

        <div className="mt-[25px]">
          <Heading>Forget password</Heading>
        </div>
        <div className="mt-[17px]">
          <SubText>Enter the email address associated with an account.</SubText>
        </div>

        <ForgotPasswordForm />

        <p className="mt-[20px] text-center text-[15px] font-medium text-[#202124]">
          <Link href="/login">&larr; Back to login</Link>
        </p>
      </AuthShell>
    </>
  );
}