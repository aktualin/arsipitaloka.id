import Image from "next/image";
import Link from "next/link";

export default function CtaBanner() {
  return (
    <section className="relative w-full">
      <Image
        src="https://assets.negara.co.id/uploads/2026/09/23/a2edd6e9-2a26-423c-bdc2-849784378505.jpg"
        alt="Rieke Diah Pitaloka"
        width={1200}
        height={800}
        sizes="100vw"
        className="h-auto w-full"
      />
      {/* Overlay zona klik Biografi (desktop only). Tombol mobile ada di bawah gambar agar mudah tap. */}
      <div className="absolute inset-0 sm:block hidden">
        <Link
          href="/about"
          aria-label="Biografi"
          className="block absolute"
          style={{ left: "44%", top: "63%", width: "12%", height: "14%" }}
        />
      </div>

      {/* Tombol Biografi — hanya tampil di mobile sebagai elemen HTML agar mudah ditap. */}
      <div className="sm:hidden relative -mt-[6rem] mb-[-3rem] flex justify-center z-10">
        <Link
          href="/about"
          className="rounded-full bg-maroon-dark px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-maroon transition-colors"
        >
          Biografi
        </Link>
      </div>
    </section>
  );
}
