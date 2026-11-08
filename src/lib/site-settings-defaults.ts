/**
 * Nilai bawaan pengaturan situs + konstanta yang dipakai form admin.
 *
 * File ini SENGAJA tidak meng-import `next/cache` atau Prisma supaya bisa
 * dipakai juga oleh `prisma/seed.ts` (script Node) selain aplikasi.
 *
 * Kalau nilai di DB kosong, halaman publik memakai nilai di sini — jadi
 * beranda tidak pernah tampil dengan teks kosong.
 */

/**
 * Nilai dummy untuk field pengaturan bertipe secret (Server Key Midtrans).
 * Modul ini bebas import server-only supaya komponen client bisa memakainya.
 */
export const SECRET_MASK = "********";

export const DEFAULT_SETTINGS: Record<string, string> = {
  // Profil
  "company.name": "Pitaloka",
  "company.tagline": "Pustaka digital & e-book",
  "company.description":
    "Arsip Pitaloka adalah pustaka digital yang membuat akses pengetahuan lebih mudah.",
  "company.address": "Jakarta, Indonesia",
  "company.phone": "",
  "company.email": "halo@arsippitaloka.com",
  "company.logoUrl": "/images/logo-pitaloka.png",
  "company.copyright": "@2026 Pitaloka. All Rights Reserved.",

  // Halaman utama — kategori
  "home.categories.eyebrow": "Featured Categories",
  "home.categories.title": "Feature of Pitaloka",
  "home.categories.button": "View More",

  // Halaman utama — buku
  "home.courses.eyebrow": "Featured Courses",
  "home.courses.title": "Berkembang dan Update bersama Pitaloka",
  "home.courses.button": "View More",
  "home.courses.readButton": "Read Now",
  "home.courses.priceSuffix": "/lifetime",

  // Halaman utama — #ViralForJustice
  "home.viral.eyebrow": "Now in 2026",
  "home.viral.title": "#ViralForJustice",
  "home.viral.subtitle": "Rieke Diah Pitaloka",
  "home.viral.body":
    "Fenomena viral for justice kini menjadi alternatif utama masyarakat dalam memperjuangkan keadilan ketika jalur hukum formal terasa lambat dan tidak berpihak. Kekuatan suara netizen di media sosial terbukti mampu menekan pihak berwenang untuk mengusut tuntas berbagai kasus kejahatan maupun ketidakadilan yang sebelumnya terabaikan. Namun, di balik efektivitasnya sebagai kontrol sosial, gerakan ini juga menyimpan risiko besar seperti sanksi sosial yang salah sasaran hingga penggiringan opini tanpa bukti sah. Oleh karena itu, kesadaran dan etika masyarakat dalam menyaring informasi tetap menjadi kunci agar keadilan yang diperjuangkan tidak berubah menjadi aksi main hakim sendiri di dunia maya.",
  "home.viral.image": "/images/viral-justice-poster.jpg",

  // Halaman utama — dokumentasi
  "home.documentation.eyebrow": "Dokumentasi & Arsip Digital",
  "home.documentation.signature": "Rieke Diah Pitaloka,",

  // Katalog media sosial (/buku/kategori/social-media)
  "social.catalog.eyebrow": "Media Sosial",
  "social.catalog.title": "Sorotan Media Sosial",
  "social.catalog.subtitle":
    "Cuplikan konten TikTok, YouTube, dan Instagram terbaru dari Arsip Pitaloka — tiap video bisa terhubung ke e-book, dokumentasi, dan tab konten terkait.",

  // Footer
  "footer.browse.title": "Browse",
  "footer.browse.links": "E- Book\nDokumentasi\nBerita Terkini",
  "footer.platform.title": "Platform",
  "footer.platform.links": "About",
  "footer.subscribe.placeholder": "Enter your email",
  "footer.subscribe.button": "Search",
  "footer.subscribe.text":
    "By subscribing, you agree to our Privacy Policy and consent to receive updates from our company.",
  "footer.legal.privacy": "Privacy Policy",
  "footer.legal.terms": "Terms of Service",
  "footer.legal.cookies": "Cookies Settings",

  // Copy lain
  "company.vision": "Menjadikan ilmu dan karya Rieke Diah Pitaloka tersedia untuk semua.",
  "company.mission": "Menyimpan dan lestarkan karya melalui media digital.",
  "company.social.tiktok": "",
  "company.social.youtube": "",
  "company.social.instagram": "",

  // Kontak / SMTP
  "contact.smtp.enabled": "false",
  "contact.smtp.host": "",
  "contact.smtp.port": "587",
  "contact.smtp.user": "",
  "contact.smtp.pass": "",
  "contact.smtp.from": "",
  "contact.smtp.to": "",
  "contact.smtp.servername": "",

  // Newsletter (kabar baru ke pelanggan yang berlangganan)
  "newsletter.enabled": "true",
  "newsletter.fromName": "Arsip Pitaloka",
  "newsletter.sendWelcome": "true",

  // Notifikasi order (email konfirmasi pembelian ke pembeli)
  "order.email.enabled": "true",
  "order.email.fromName": "Arsip Pitaloka",

  // Autentikasi
  // Masa berlaku OTP reset password (menit).
  "auth.otp.expiryMinutes": "5",
  "auth.otp.maxAttempts": "5",

  // Pajak
  "tax.enabled": "false",
  "tax.type": "percentage",
  "tax.percentage": "11",
  "tax.fixedAmount": "5000",
};
