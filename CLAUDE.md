# CLAUDE.md

Panduan kerja untuk proyek **Arsip Pitaloka**. Lihat `README.md` untuk gambaran umum, stack, dan cara menjalankan.

## Prinsip utama: desain harus cocok dengan PDF

Sumber kebenaran desain adalah `references/layouts/26102026_UI_PITALOKA_MENU.pdf`. Halaman 1 = welcome page. Jangan mengarang layout, warna, atau teks — ambil dari PDF.

Cara membaca PDF (file besar, ~76MB):

```bash
pdftoppm -f 1 -l 1 -r 150 -png references/layouts/26102026_UI_PITALOKA_MENU.pdf /tmp/page
```

Render 150 DPI menghasilkan 4000×14050 px untuk halaman 1. PIL butuh `Image.MAX_IMAGE_PIXELS = None` agar tidak kena proteksi decompression bomb.

## JANGAN ubah Hero.tsx dan CtaBanner.tsx

Keduanya sengaja menampilkan **render PDF utuh** (`hero-full.jpg`, `cta-full.jpg`) yang teksnya sudah menyatu dalam gambar, plus overlay transparan untuk interaktivitas.

Jangan merender ulang judul/subjudul/tombol section itu sebagai teks HTML. Pendekatan berikut sudah dicoba dan **gagal**:

- Overlay gelap + blur → teks putih besar yang terbakar tetap terbaca sebagai bayangan
- Inpainting (cv2 Telea/NS) → menyisakan noda dan band blur pada teks tebal
- Crop region bebas teks → komposisi jadi berbeda dari PDF

Kalau butuh ubah teks hero/CTA, ubah di sumber desain lalu render ulang gambarnya.

## Saat menurunkan aset dari PDF

- Potong tepat di batas section. Cari baris putih margin halaman dengan memindai kecerahan baris (`np.array(img)[y].mean() > 250`) — menyisakan 1 baris putih saja akan muncul sebagai garis/band abu-abu setelah kena overlay.
- Jangan memasukkan elemen UI yang juga dirender HTML (badge, kartu caption), nanti dobel.
- Logo: ekstrak alpha dari latar maroon footer (`min(RGB) > 120` → alpha), bukan dari navbar yang latarnya foto.

## Halaman auth (login / register / forgot) dan 404

Berbeda dari hero beranda, panel form **dibangun sebagai HTML sungguhan** (harus bisa diisi), dan hanya **foto kolom kiri** yang diambil dari PDF. Halaman 404 mengikuti pola hero: gambar PDF utuh + overlay transparan, dengan `Footer` yang sudah ada.

Desain auth memakai kanvas 1920x1080; 1 px desain = 2.0833 px render pada 150 DPI. Posisi diambil dari PDF lalu dikunci lewat prop `contentLeft`/`contentTop` di `AuthShell`, bukan dengan rata tengah — rata tengah menimbulkan drift kumulatif.

Verifikasi posisi pakai `getBoundingClientRect` lewat Playwright, bukan pemindaian piksel: bandingkan `top`/`left` tiap elemen dengan angka PDF (toleransi ~1px). Pemindaian piksel mengukur batas tinta, bukan batas kotak, jadi menyesatkan untuk mengatur margin.

Teks mengikuti desain apa adanya, termasuk yang terlihat seperti salah tik: **"Fotget password"**, **"Forget password"**, dan spasi ganda pada **"Reset  password"**. Jangan "diperbaiki" tanpa persetujuan pengguna.

### Perilaku login

- **"Remember me"** benar-benar affects masa berlaku session: dicentang → 30
  hari, tidak dicentang → 1 hari (`src/auth.ts`, `SESSION_LONG`/`SESSION_SHORT`).
- **Pesan error** dibedakan setelah `signIn` gagal: `POST /api/auth/login-diagnostic`
  memberitahu kalau akun **terkunci** (kena pengaman 5× gagal → 15 menit) atau
  akun **dinonaktifkan**. Endpoint itu hanya membocorkan keadaan akun kalau
  password yang diketik **benar** — email tidak dikenal atau password salah
  dibalas pesan generik yang sama, supaya halaman login tidak bisa dipakai
  menebak email terdaftar (sama seperti aturan `/forgot-password`).

## Cache gambar Next.js

Menimpa file di `public/images/` **tidak cukup** — optimizer tetap menyajikan versi lama, bahkan setelah `rm -rf .next/cache/images`. Yang berhasil:

```bash
pkill -f "next dev"; rm -rf .next; npm run dev
```

Selalu lakukan ini setelah mengganti gambar, sebelum verifikasi visual.

## Prisma 7

- `url` **tidak boleh** ada di `schema.prisma` — letakkan di `prisma.config.ts` pada `datasource.url`, dan `import "dotenv/config"` di atas file itu.
- Perintah seed harus `npx tsx prisma/seed.ts`; tanpa `npx` gagal `spawn tsx ENOENT`.
- Client digenerate ke `prisma/generated/prisma`, bukan `node_modules`. Import via `src/lib/prisma.ts`.
- `prisma/generated/` **di-gitignore** dan di-generate ulang otomatis oleh `postinstall` (`prisma generate`). Kalau `prisma.user` / enum undefined saat runtime → jalankan `./node_modules/.bin/prisma generate`.
- Nama delegate Prisma hanya menurunkan huruf pertama model: `TiktokPost` → `prisma.tiktokPost`, `TikTokPost` → `prisma.tikTokPost` (jangan-Jangan). Karena itu model ditulis `TiktokPost`.
- `DATABASE_URL` lokal memakai `sslmode=disable` (Postgres di Docker tidak punya TLS). Untuk DB remote (Prisma Postgres) tetap `sslmode=verify-full` — jangan turunkan ke `require`.
- Seed **idempotent**: pakai `upsert` dengan id deterministik (`seed-book-0`, dst). Jangan `deleteMany` Book — `OrderItem.book` memakai `onDelete: Restrict`.

## Cache Components (Next.js 16)

`cacheComponents: true` aktif. Setiap Server Component yang query database **wajib** punya `"use cache"` di baris pertama fungsi, kalau tidak build/prerender gagal dengan "uncached data during prerendering".

Jangan pakai `export const instant = false` — itu membuat route jadi blocking. Dengan `"use cache"`, route `/` tetap statis dengan revalidate 15 menit.

Halaman yang membaca cookie/params (area admin & area pembeli) **tidak** bisa memakai `"use cache"`. Polanya: komponen default synchronously membungkus isi dinamis dengan `<Suspense>`, lalu komponen async di dalamnya memanggil `await connection()`. Tanpa boundary itu build gagal dengan "uncached data during prerendering". `await connection()` di dalam boundary tetap wajib — `connection()` tidak bisa di-cache.

## Model konten (PENTING — berubah besar)

Tabel **`ContentTab` sudah DIHAPUS**. "Tab/kanal" sekarang **daftar statis** di
`src/lib/site-tabs.ts` (`SITE_TABS`), bukan data DB. Isi tiap kanal dipisah per
jenisnya:

| Kanal | Sumber data | Sifat |
| --- | --- | --- |
| E-Book | `Book` | Produk: ada harga, keranjang, checkout |
| Berita Terkini / Blog / UMKM | `Article` (`type`) | Artikel bebas baca — TANPA harga/keranjang |
| YouTube | `SocialMedia` (platform youtube) | Video |
| TikTok | `TiktokPost` | Video (diunggah di `/admin/tiktok`) |
| Dokumentasi | `Documentation` | Pola blog |

- `Book` **tidak punya** `tabId` lagi — semua buku adalah e-book
  (`BOOK_TAB_SLUG = "e-book"`). URL detail tetap `/buku/e-book/<slug>`.
- `Article` dibaca di `/artikel/<slug>` (`src/app/artikel/[slug]`), isinya
  rich-text (Tiptap, `type: "richtext"` = editor seperti MS Word: heading,
  list, gambar, tautan, YouTube).
- `/buku/<tab>` mengarahkan ke tampilan sesuai jenis kanal
  (`src/app/buku/[tab]/page.tsx`): katalog buku, `ArticleCatalog`,
  `SocialMediaCatalog`/`TikTokCatalog`, atau redirect ke News & Views.
- `SocialMedia.contentTabId` diganti `articleId` (relasi ke `Article`).
- Buku **gratis** di kartu → tombol **Download** (`FreeDownloadButton`): klaim
  via `/api/checkout` (jadi order PAID → tercatat di `/akun`), lalu buka
  `/api/read/<id>` di tab baru (PDF/gambar preview inline; format lain terunduh).
  Buku berbayar → Keranjang + Beli.
- Admin generik: tambah/ubah dibuka sebagai **halaman tersendiri**
  (`/admin/<entity>?create=1` dan `?edit=<id>`), bukan form inline.
- Menu admin dikelompokkan (`ADMIN_MENU` di `entities.ts`): Toko E-Book
  (Buku/Kategori/Order), Konten (Berita/Blog/UMKM/Dokumentasi), Media Sosial,
  User, Profil. Tidak ada menu "Tab Konten".

## Dashboard admin (Chart.js)

Semua laporan menyatu di **satu halaman** `/admin` — tidak ada route
`/laporan` terpisah. Semuanya berbasis **Chart.js** (`react-chartjs-2`),
bisa **filter tanggal** dan **ekspor Excel/CSV**:

| Route | Isi |
| --- | --- |
| `/admin` | Dashboard: 6 KPI, 20 grafik, tabel rinci, tabel transaksi |
| `/admin/export` | Route handler unduh file (bukan halaman) |

Isi `/admin` berurutan: filter periode → navbar antar-bagian (anchor) →
KPI → grafik → tabel (ringkasan periode, per buku, per kategori, pelanggan,
persediaan konten) → rincian transaksi (filter status + pencarian,
paginasi server).

### Default rentang

Default = **12 bulan terakhir, dikelompokkan per bulan** (`preset=12m`).
Preset lain: `30d`, `90d`, `ytd`, dan rentang bebas (`from`/`to`).
Query string: `from`, `to`, `g=daily|monthly`, `preset`, plus `status`/`q`/
`page`/`per` untuk tabel transaksi.

Logika rentang & zona waktu ada di `src/lib/admin/date-range.ts` —
semua tanggal dihitung dalam **WIB (UTC+7)** supaya "hari"/"bulan" sama
dengan yang dilihat admin di kalender.

### Komponen

| Berkas | Isi |
| --- | --- |
| `src/app/admin/page.tsx` | Orkestrasi halaman (server) |
| `src/components/admin/dashboard/DashboardCharts.tsx` | Semua `ChartCard` |
| `src/components/admin/dashboard/DashboardTables.tsx` | Tabel ringkasan & rinci |
| `src/components/admin/dashboard/TransactionTable.tsx` | Tabel transaksi + filter |
| `src/components/admin/dashboard/DateRangeFilter.tsx` | Kontrol periode (server) |
| `src/components/admin/dashboard/ExportButtons.tsx` | Tombol unduh |
| `src/components/admin/dashboard/SectionNav.tsx` | Anchor antar-bagian |
| `src/components/admin/dashboard/charts.tsx` | `LineChart`/`BarChart`/`DoughnutChart` |
| `src/components/admin/dashboard/ChartCard.tsx` | Kartu + alih Grafik/Tabel |

### Aturan penting

- **Agregasi selalu di server** (`src/lib/admin/stats.ts`) — halaman hanya
  menerima angka yang sudah diringkas, browser tidak pernah menarik ribuan
  baris order. Metrik berbasis `Order.createdAt` (bukan `paidAt`) supaya
  filter tanggal berlaku sama untuk semua grafik & tabel.
- **Klausa WHERE tabel transaksi & ekspor harus sama** — pakai
  `buildOrderWhere()` di `stats.ts`, bukan filter manual di memori.
- **Paginasi di server** (Prisma `skip`/`take` + `count`).
- **Warna tidak pernah sendirian membawa arti** — selalu ada label, legenda,
  atau tabel. Tiap `ChartCard` punya tombol alih **Grafik/Tabel** sebagai
  relieving wajib untuk kontras < 3:1 & pembaca layar.
- Palet (`src/components/admin/dashboard/palette.ts`) **tidak boleh diacak
  atau dirotasi**: slot 1 = nilai uang, slot 2 = jumlah, slot 3 = rata-rata.
- Kolom teks PDF & typo di desain **tidak boleh "diperbaiki"** tanpa
  persetujuan pengguna.

### Path admin yang tidak dikenal

`/admin/<segmen>` yang bukan entitas CRUD dan bukan route admin khusus
diarahkan ke `/admin` **di `src/proxy.ts`** (307). Alasannya: route generik
`/admin/[entity]` berada di dalam `<Suspense>` layout admin, dan
`notFound()` di dalam boundary itu menghasilkan **status 200 dengan halaman
404** — bukan 404 sungguhan. Di proxy, redirect-nya jadi 307 yang benar.

Route admin khusus yang harus didaftarkan di `ADMIN_PAGES` (`src/proxy.ts`):
`akun`, `export`, `media`, `newsletter`, `orders`, `profile`, `users`.
Route baru di area admin **wajib** ditambah ke sana, kalau tidak akan
diarahkan ke `/admin`.

### Tabel admin: urutan, bulk action, pratinjau

- **Urutan kolom** — klik header kolom mengurutkan (`?sort=<field>&dir=asc|desc`).
  Nama field dari URL divalidasi dulu oleh `parseSort()`
  (`src/lib/admin/entities.ts`) — daftar yang boleh diurutkan = kolom `list`
  kecuali richtext/gambar/file. Nilai mentah dari URL **tidak boleh** masuk
  ke `orderBy` Prisma.
- **Bulk action** — tabel admin punya checkbox per baris; tombol "Hapus
  terpilih" memanggil `bulkDeleteEntity()` (`src/lib/admin/actions.ts`).
  Baris yang gagal (mis. buku yang sudah pernah dipesan — FK Restrict)
  dilaporkan lewat query `flash=ok:<pesan>` / `flash=err:<pesan>`, bukan
  menggagalkan seluruh proses. Filter & urutan aktif ikut dibawa balik.
- **Pratinjau** — tombol "Pratinjau" di baris tabel membuka halaman publik
  dengan `?preview=1` (lihat bagian "Pratinjau sebelum tayang").

### Media & import CSV

- `/admin/media` — daftar berkas hasil unggahan admin (`public/uploads`),
  lengkap dengan pratinjau gambar dan tombol hapus. Berkas **PDF e-book**
  tidak ada di sini (disimpan di `storage/private`, hanya lewat
  `/api/read` & `/api/download`).
- `/admin/book/import` — impor buku dari CSV. Parser CSV sendiri di
  `src/lib/csv.ts` (tanpa dependensi baru): BOM UTF-8, CRLF/LF/CR, kolom
  berkutip, pemisah `,`/`;`/tab. Baris dengan slug yang sudah ada **dilewati**
  (bukan ditulis ulang) supaya impor bisa diulang dengan aman.
- `npm run preview:order-email` merender email order ke HTML **tanpa
  mengirim** — dipakai untuk cek isi email.

### Ekspor Excel/CSV

- `src/lib/admin/export.ts` menulis **XLSX asli** sendiri (paket zip berisi
  XML) memakai `fflate` — tanpa pustaka tambahan. Kolom uang/jumlah ditulis
  sebagai **angka** supaya bisa dijumlahkan di Excel.
- CSV pakai **BOM UTF-8** + line ending CRLF supaya Excel (Windows) tidak
  merusak karakter non-ASCII.
- Isi file unduhan dibangun dari `src/lib/admin/report-sheets.ts` — satu
  sumber untuk tabel di layar dan file Excel, jadi angkanya identik.
- `report=transactions|stats|products|customers|content|users|all`. CSV hanya
  bisa memuat satu tabel, jadi sheet pertama yang dipakai.
- `report=users` = daftar seluruh akun (termasuk admin), dipakai tombol
  "Unduh CSV / Unduh Excel" di `/admin/users`. Laporan ini **tidak**
  bergantung filter periode.

### Chart.js

- `src/components/admin/dashboard/charts.tsx` mendaftarkan Chart.js **di
  modul client** dan hanya mengimpor `chart.js` dari file "use client" —
  jangan pernah membawanya ke server component.
- Skala nilai uang memakai label ringkas ("1,2 jt"), bukan angka penuh.


## Seed konten (data NYATA)

Seed memakai konten sungguhan tentang **Rieke Diah Pitaloka** — nama lengkapnya
Rieke Diah Pitaloka Intan Purnamasari: anggota DPR RI, penulis, dan initiator
gerakan `#ViralForJustice`. Namanya sering keliru ditulis "Rikeu" atau
"Rieke Dyah" — pakai ejaan yang benar.

Berkas seed:

| Berkas | Isi |
| --- | --- |
| `prisma/seed.ts` | Logika seed: upsert, user, order, pengaturan |
| `prisma/seed-content.ts` | Kategori + 6 buku (5 karya nyata + 1 panduan gratis) |
| `prisma/seed-articles.ts` | 17 artikel (12 berita + 3 blog + 2 UMKM) |
| `prisma/seed-media.ts` | 12 video YouTube + 14 video TikTok (id asli) |
| `scripts/reset-db.ts` | Mengosongkan semua tabel (`npm run db:reset`) |

- **Buku** — 5 karya nyata (ISBN & jumlah halaman dari katalog Open Library):
  *Renungan Kloset* (2003), *Kekerasan Negara Menular ke Masyarakat* (2004),
  *Ups!* (2005), *Banalitas Kekerasan* (2010), *Sumpah Saripah* (2011).
- **Video** — `videoId` YouTube diverifikasi lewat oEmbed; TikTok diambil dari
  halaman tag resmi + API publik. Cover disimpan lokal di
  `public/images/seed/` karena URL CDN TikTok bertanda tangan cepat kedaluwarsa.
- **Gambar artikel** — dari Wikimedia Commons. Atribusi lisensi ada di
  `public/images/seed/CREDITS.md` **dan** di `<figcaption>` tiap artikel.
  Jangan pakai gambar tanpa atribusi.
- **User seed** — 4 pembeli (`rizky.pratama@example.com`, `siti.aminah@example.com`,
  `budi.santoso@example.com`, `dewi.lestari@example.com`) dengan password
  `SEED_USER_PASSWORD` (default `Pitaloka2026!`). Admin tetap dari
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` di `.env`.
- Seed **idempotent** (upsert id deterministik). Urutan yang benar untuk
  mengisi ulang database: `npm run db:reset` lalu `npm run db:seed`.

## Kontak / SMTP

Formulir kontak di `/kontak` (`ContactForm` → `POST /api/contact` →
`src/lib/smtp.ts`, pakai `nodemailer`). Bisa di-on/off + dikonfigurasi dari
`/admin/profile` grup **"Kontak / SMTP"** (host/port/user/pass/from/to),
fallback ke env `SMTP_*`. Password SMTP bertipe `secret` (tidak pernah ke
browser).

**Nilai DB menang atas `.env`.** Jadi kalau `contact.smtp.host` di DB terisi,
`SMTP_HOST` di `.env` diabaikan. `contact.smtp.port` sudah terisi `587` dari
seed — kosongkan dari admin kalau mau port lain dipakai.

### Server SMTP yang dipakai

| Item | Nilai |
| --- | --- |
| Server | Exim 4.100.1 (rumahweb) `galaggara.iixcp.rumahweb.net` |
| Host | `202.10.43.86` (**alamat IP**, bukan hostname) |
| Port | `465` (implicit TLS / "Secure SSL/TLS") |
| Auth | `info@arsipitaloka.id` + password mailbox |
| Sertifikat | CN `cpcalendars.arsipitaloka.id` (SAN mencakup `mail.arsipitaloka.id`) |

- **DNS `mail.arsipitaloka.id` salah arah** (mengarah ke IP lain yang
  port 465/587-nya tidak terjangkau). Karena itu host diisi IP, dan
  `SMTP_SERVERNAME=mail.arsipitaloka.id` dipakai untuk SNI + verifikasi
  sertifikat TLS (setting DB: `contact.smtp.servername`). Tanpa itu, koneksi
  TLS ke IP ditolak.
- **Jangan pakai `pool: true`** di nodemailer — connection pool timeout saat
  setup koneksi ke Exim ini. Tiap email membuka koneksi sendiri, dikirim per
  batch 10 (`src/lib/newsletter.ts`).
- **Salam server lambat** (~24 detik, karena Exim melakukan reverse-DNS lookup
  IP klien). Timeout koneksi jadi 45 detik (`connectionTimeout`,
  `greetingTimeout`) — jangan diturunkan ke bawah 30 detik.
- Domain email yang bisa menerima: **`arsipitaloka.id`**. `arsippitaloka.com`
  tidak ada di DNS, jadi alamat email berakhiran domain itu tidak bisa
  menerima mail. Akun admin memakai `info@arsipitaloka.id` (sinkron dengan
  `ADMIN_EMAIL` di `.env`). Script bantu: `npx tsx scripts/list-users.ts`,
  `npx tsx scripts/update-user-email.ts <email>`.

## Newsletter (kabar baru ke pelanggan)

Pelanggan newsletter disimpan di tabel `NewsletterSubscriber` (email unik,
sumber langganan, status aktif). Email yang masuk dibungkus template bertema
maroon (`src/lib/mail/theme.ts` + `src/lib/mail/templates.ts`) — layout
tabel + style inline supaya rapi di Gmail/Outlook.

| Pemicu | Efek |
| --- | --- |
| Form subscribe di footer (`NewsletterForm`) | langganan + email-electron |
| Checkbox newsletter di `/register` | langganan otomatis (server-side, `source: "register"`) |
| Admin menyimpan buku / berita / artikel / dokumentasi **yang baru tayang atau isinya berubah** | email pengumuman ke semua pelanggan aktif + tautan ke detail konten |
| Admin kirim pengumuman manual (`/admin/newsletter`) | email bebas ke semua pelanggan |

- Route: `POST /api/newsletter/subscribe`, `GET /api/newsletter/unsubscribe`
  (link berhenti langganan di footer email, token HMAC).
- Pengaturan grup **"Newsletter"** di `/admin/profile`: aktif/nonaktif, nama
  pengirim, kirim email sambutan.
- Riwayat pengiriman disimpan di `NewsletterCampaign` (tampil di
  `/admin/newsletter`).
- Gambar sampul yang diunggah admin berupa data URL → **tidak** bisa dimuat
  email client, jadi dilewati (`absoluteMediaUrl`).
- User yang sudah ada bisa dimasukkan ke daftar sekaligus dengan
  `npm run db:backfill:newsletter` (balik: `--undo`).

## Email notifikasi order (transaksional)

Pembeli menerima **satu email** saat order-nya **lunas** (bukan saat order
dibuat) — supaya tidak ada dua email untuk satu order dan email yang masuk
adalah yang benar-benar berarti.

- Pemicu email: transisi status order ke `PAID`/`COMPLETED` — webhook
  Midtrans, callback browser, polling status, order buku gratis, dan admin
  menandai lunas manual di `/admin/orders`.
- **Tanpa kolom baru di DB.** Penanda "sudah kirim" = hasil `updateMany`
  bersyarat (`status notIn [PAID, COMPLETED]`), jadi webhook + callback yang
  jalan bersamaan hanya menghasilkan **satu** email.
- Email dikirim lewat `after()` Next.js (tidak menahan respons) — SMTP Exim
  lambat ±25 detik, dan callback Midtrans tidak boleh ikut melambat.
  Kegagalan kirim **tidak pernah** merusak pembayaran (try/catch + log).
- Pengaturan grup **"Order"** di `/admin/profile`: `order.email.enabled`,
  `order.email.fromName`.
- Template: `orderConfirmationMail()` di `src/lib/mail/templates.ts`,
  inti pengiriman di `src/lib/order-notification.ts`.
- Cek isi email tanpa mengirim: `npm run preview:order-email`.

## OTP reset password

`/forgot-password` dua tahap: (1) kirim email → server mengirim kode OTP 6
angka; (2) masukkan kode + password baru.

- Route: `POST /api/auth/forgot-password` (kirim kode),
  `POST /api/auth/reset-password` (verifikasi + ganti password).
- Kode berlaku **5 menit** (`auth.otp.expiryMinutes`) dan maksimal 5 percobaan
  (`auth.otp.maxAttempts`) — keduanya diatur dari `/admin/profile` grup
  "Autentikasi".
- Yang disimpan di `PasswordResetToken` hanya **hash** kode (sha256 +
  `AUTH_SECRET`), bukan kode-nya. Token lama dibuang saat kode baru dibuat,
  dan token dihapus setelah dipakai.
- Balasan `/api/auth/forgot-password` selalu sama untuk email terdaftar
  maupun tidak — supaya halaman ini tidak bisa dipakai menebak email yang
  punya akun.

## Uji coba email

Uji ke server sungguhan (butuh ~25 detik per email karena salam Exim lambat):

```bash
npm run test:newsletter   # subscribe + broadcast + OTP ke mailbox sungguhan
npm run test:otp          # alur reset password lewat HTTP (butuh dev server)
npm run db:check:smtp     # isi pengaturan SMTP di DB (tanpa menampilkan password)
npm run smtp:probe        # cek koneksi TLS + banner + sertifikat server SMTP
```

Kalau server SMTP produksi tidak bisa dijangkau, pakai SMTP sink lokal:

```bash
node scripts/smtp-sink.mjs 1025   # mencatat email ke /tmp/mailsink/outbox.jsonl
SMOKE_USE_OVERRIDE=1 npx tsx scripts/newsletter-smoke.ts   # pakai sink lokal
```

`SMTP_*` di `.env` dipakai kalau host/port di DB kosong.

## Dua area terpisah: admin vs pembeli

- **Area admin (`/admin`)** — back-office untuk mengelola konten: buku, kategori, tab konten, dokumentasi, TikTok, order, user, dan profil perusahaan. Guard: `src/proxy.ts` (lapis 1, JWT) + `requireAdmin()` (lapis 2, cek role ke DB).
- **Area pembeli (`/akun`)** — untuk user yang login biasa: Pustaka Saya (buku yang sudah dibeli), Riwayat Order, dan Profil. Guard: `src/proxy.ts` mensyaratkan sesi (role apa pun), `requireUser()` memverifikasi user masih aktif.
- Setelah sign-in, pembeli diarahkan ke `/akun` dan admin ke `/admin`
  (`src/components/auth/LoginForm.tsx`), kecuali ada `?callbackUrl=` eksplisit.

### Guard area privat: jangan melempar error di dalam `<Suspense>`

Layout admin (`src/app/admin/layout.tsx`) dan layout pembeli
(`src/app/akun/layout.tsx`) membungkus seluruh shell + guard di dalam
`<Suspense>` (wajib, karena `cacheComponents` aktif dan guard membaca cookie).

**Di dalam boundary itu jangan pernah melempar error** — bukan `notFound()`,
bukan `throw`. Lemparan apa pun membuat route gagal dirender:

- status HTTP jadi **200** dengan shell kosong (halaman 404 tidak pernah
  terkirim), dan
- validasi "instant" (eksperimental Next.js) gagal → muncul di console dev:

  ```
  Route "/admin": Could not validate `instant` because the target segment
  was prevented from rendering, likely due to the following error.
  ```

Pakai `redirect()` saja (Next memperlakukannya sebagai navigasi, bukan error).
Karena itu guard memakai `resolveAdminAccess()` (`src/lib/admin/require-admin.ts`)
yang membedakan empat kondisi:

| Status | Arti | Tindakan |
| --- | --- | --- |
| `anonymous` | tidak ada sesi | `redirect("/login?callbackUrl=/admin")` |
| `forbidden` | user ada, role bukan ADMIN | `redirect("/akun")` |
| `stale` | sesi menunjuk user yang sudah tidak ada di DB (mis. setelah `db:reset`) | `redirect("/login")` — **tanpa** `callbackUrl`, supaya tidak berputar antara `/login` dan `/admin` |
| `admin` | user ada, role ADMIN | render shell admin |

Sesi basi ini sering muncul setelah `npm run db:reset` — id admin di-seed
ulang, jadi JWT di browser menunjuk user yang sudah tidak ada. Gejalanya:
`/admin` tidak bisa dibuka dan console dev penuh error "instant". Solusinya:
logout lalu login ulang.

Kedua layout juga meng-export
`export const instant = { unstable_disableValidation: true }` supaya validasi
"instant" tidak dijalankan untuk area privat ini (area ini sepenuhnya dinamis,
tidak ada gunanya diuji "instan"). Route publik tetap divalidasi.

### Pustaka pembeli harus lengkap

`getLibrary()` (`src/lib/library.ts`) mengembalikan **semua** buku yang
relevan dengan user — tidak ada yang disembunyikan:

- semua item order apa pun statusnya (PAID/SHIPPED/PENDING/CANCELLED), digabung
  per buku jadi satu kartu + riwayat pembelanjaannya;
- buku gratis yang belum pernah dibeli (dan belum diarsipkan).

Status `SHIPPED` **memberi hak akses** — artinya sudah dibayar lalu dikirim.
Hanya PENDING (belum dibayar) dan CANCELLED yang belum memberi akses.
`ACCESS_STATUSES` di `src/lib/library.ts` adalah satu sumber kebenaran untuk
aturan ini; `canAccessBook()` memakainya untuk `/api/read` dan `/api/download`.

### Hak akses & larangan membeli ulang

Dua aturan yang ditegakkan **di server** (bukan hanya di UI):

1. **Buku yang sudah dibeli tidak bisa dibeli lagi.**
   - `POST /api/checkout` → `alreadyOwned: true` + arahkan ke `/akun`.
   - `POST /api/cart` → status `owned` (ditolak, tidak ditambahkan).
   - `POST /api/cart/checkout` → item yang sudah dimiliki dibuang dari
     keranjang dan dilewati.
   - Kalau masih ada order **PENDING** untuk buku yang sama → `409`, supaya
     tidak ada pembayaran dobel.
2. **User yang belum beli tidak boleh preview/unduh lewat API.**
   - `GET /api/read/<bookId>` dan `GET /api/download/<bookId>` → `403`
     ("Buku ini belum Anda beli") kalau tidak punya order lunas.
   - Tanpa sesi → `401`.

**Buku gratis tidak otomatis bisa diakses.** Ia harus diklaim dulu:
`POST /api/checkout` membuat order `PAID` (gratis, tanpa gateway), baru
`/api/read` boleh melayani filenya. Klaim kedua → `alreadyOwned` (tidak ada
order baru). Buku gratis juga tidak boleh masuk keranjang (status `free`) —
mengunduh langsung dari halaman buku.

Ownership di tampilan (katalog, beranda, pustaka, keranjang):

- `getOwnedBookIds(userId)` → daftar id buku yang sudah dimiliki.
- `GET /api/library/owned` → endpoint untuk komponen client.
- `OwnedBooksProvider` (client) mengambil daftar itu sekali per halaman;
  `OwnedBookActions` menggantinya baris tombol "Beli/Keranjang" dengan
  "Baca" + "Pustaka", dan `OwnedBadge` memunculkan badge "Dimiliki".
  Pengecekan dilakukan di client supaya halaman publik tetap bisa di-cache
  (halaman katalog/beranda tidak membaca cookie di Server Component).

Uji otomatis: `npm run test:book-access` (18 pemeriksaan; butuh dev server
jalan di `http://localhost:3000`).

### Katalog publik & tab yang bisa diklik

URL katalog memakai **path**, bukan query string, dan detail buku hidup
**di bawah tabnya**:

| URL | Isi |
| --- | --- |
| `/buku` | katalog semua buku |
| `/buku/<slug-tab>` | katalog per tab (mis. `/buku/berita-terkini`) |
| `/buku/kategori/<slug>` | katalog per kategori (mis. `/buku/kategori/biografi`) |
| `/buku/<slug-tab>/<slug-buku>` | detail buku (metadata lengkap, tombol Baca/Unduh bila pemili, CTA Beli bila belum login) |

Route: `src/app/buku/[tab]/page.tsx` (katalog tab),
`src/app/buku/[tab]/[slug]/page.tsx` (detail buku),
`src/app/buku/kategori/[slug]/page.tsx` (katalog kategori).
Kategori memakai prefiks `/buku/kategori/` karena ada tab dan kategori yang
namanya sama ("blog", "e-book").

Tampilan katalog dipakai bersama oleh ketiga route lewat
`src/components/books/CatalogView.tsx` (server component) dan detail buku
dipindah ke `src/components/books/BookDetailView.tsx`. Paginasi tetap memakai
query `?page=` & `?per=` (aturan pagination proyek).

Tautan kartu buku selalu menyertakan tabnya — `BookCard` memakai field
`tabSlug` (opsional) untuk membentuk `/buku/<tab>/<slug>`; kalau `tabSlug`
kosong, jatuh ke `/buku/<slug>`.

URL lama ditangani:

- `/buku?tab=…` dan `/buku?kategori=…` → di-redirect (307) oleh
  `src/proxy.ts` ke path barunya (query `page`/`per` tetap dibawa).
- `/buku/<slug-buku>` (detail buku versi lama) → pengalihan dari sisi klien
  (`src/components/books/RedirectTo.tsx`) ke `/buku/<tab>/<slug-buku>`.
  **`redirect()` server tidak bisa dipakai di sini** karena halamannya sudah
  mulai di-stream (dynamic API dibaca di dalam Suspense) — hasilnya 404,
  bukan 307.

- Baris tab di beranda **bisa diklik**: `CoursesBrowser` (client) menyaring
  buku sesuai tab yang dipilih, dan menampilkan empty state kalau tabnya belum
  ada buku. Tab & kategori dikelola di admin → **Tab Konten** (`/admin/tab`) dan
  **Kategori** (`/admin/category`); buku diberi tab lewat field "Tab Konten"
  di `/admin/book`.
- Kartu kategori di beranda dan tautan "Browse" di footer menuju katalog
  (`/buku/kategori/<slug>` / `/buku/<slug-tab>`).
- Facet "Kategori" & "Tab Konten" di sidebar menghitung **buku + video**:
  - Buku ikut masuk kategori kalau `Book.category` cocok atau slug tabnya
    sama dengan slug kategori (mis. kategori "e-book" ikut berisi isi tab
    "e-book"). Buku tanpa kategori ditandai otomatis lewat
    `npm run db:tag-categories` (skrip `scripts/tag-book-categories.ts`).
  - Video ikut dihitung: `SocialMedia` → kategori "Social Media" + tab
    konten terkait (atau tab bukunya, atau tab default platform);
    `TiktokPost` → kategori "#ViralForJustice" + tab "TikTok"
    (`src/lib/catalog-counts.ts`).
  - Afiliasi video ke buku (`SocialMedia.bookId`) **tidak** memengaruhi
    hitungan facet — ia hanya memunculkan video sebagai section "Video
    terkait" di halaman katalog & detail buku.
- Dua kategori punya tampilan sendiri (bukan katalog buku):
  `/buku/kategori/social-media` → `SocialMediaCatalog`, dan
  `/buku/kategori/viral-for-justice` → `TikTokCatalog` (curate video TikTok).
- Overlay nav di `Hero.tsx` memakai href aktif: Home `/`, Books `/buku`,
  About `/about`, News & Views `/news-and-views`, Sign In `/login`,
  Join Us `/register`. Yang berubah hanya `href` — render gambar tidak
  disentuh.

### Fixture pembeli

`npx tsx scripts/buyer-library-fixture.ts create` membuat pembeli sementara
dengan order PAID/SHIPPED/PENDING/CANCELLED + buku gratis, untuk menguji
kelengkapan pustaka. Bersihkan dengan `... cleanup`.

CRUD admin generik: konfigurasi entitas ada di `src/lib/admin/entities.ts` (satu sumber kebenaran untuk label, kolom tabel, field form). Server action generik di `src/lib/admin/actions.ts` — nama model wajib ada di allowlist `ENTITY_MODELS`, jangan pakai string model dari URL.

## Pratinjau sebelum tayang (preview)

Admin bisa melihat tampilan final sebuah konten **sebelum** konten itu
tayang, lewat halaman publiknya + `?preview=1`:

| Entitas | URL pratinjau |
| --- | --- |
| Artikel (berita/blog/UMKM) | `/artikel/<slug>?preview=1` |
| Buku (semua e-book) | `/buku/e-book/<slug>?preview=1` |
| Dokumentasi | `/dokumentasi/<slug>?preview=1` |
| Video media sosial | `/sosmed/<id>?preview=1` |

- **Gerbang admin di server.** Isi yang belum tayang (`Article.published`,
  `Documentation.published`, `SocialMedia.published` = false) tetap 404 untuk
  pengunjung. Halaman pratinjau hanya dirender kalau pemintanya admin
  (`requireAdmin()` → `resolveAdminAccess()`, cek role ke DB). Aturan
  visibilitasnya satu sumber: `canRenderContent()` di `src/lib/preview.ts`.
- **`?preview=1` tidak membuat halaman publik.** Pengunjung yang kebetulan
  membuka URL pratinjau tetap melihat perilaku normal (tanpa banner pratinjau).
- **Tidak jadi URL duplikat**: canonical tetap URL publik tanpa query string,
  dan halaman pratinjau diberi `noindex` (`buildMetadata({ noIndex: true })`).
- Banner "Pratinjau" dirender di atas konten (`src/components/preview/PreviewBanner.tsx`)
  dengan tautan kembali ke form ubah di admin.
- Tautan "Pratinjau" di area admin dibuat dari `previewPathForEntity()`
  (`src/lib/admin/preview.ts`) — dipakai di form ubah (`EntityForm`).
- `?preview=1` ikut dibaca `generateMetadata`, jadi metadata halaman
  di-cache per (slug + status pratinjau) — bukan per query string.

## Pembayaran (Midtrans Snap)

Pembayaran e-book memakai **Midtrans Snap** (REST, tanpa SDK — `fetch` langsung
ke `app.sandbox.midtrans.com` / `app.midtrans.com`). Helper: `src/lib/midtrans.ts`.

### Konfigurasi: HANYA dari `.env`

Sumber kebenaran konfigurasi Midtrans adalah **environment variable** — bukan
database dan bukan form admin. Grup "Midtrans" di `/admin/profile` sudah
dihapus (bersama key `payment.midtrans.*` di `SiteSetting`).

| Env | Arti |
| --- | --- |
| `MIDTRANS_ENABLED` | `true` / `1` → pembayaran online aktif |
| `MIDTRANS_MODE` | `sandbox` (default) atau `production` |
| `MIDTRANS_SERVER_KEY` | Rahasia, hanya dipakai di server |
| `MIDTRANS_CLIENT_KEY` | Boleh tampil di browser |

`getMidtransConfig()` (`src/lib/midtrans.ts`) sinkron dan **tidak** query DB.
Kalau key ditolak Midtrans (HTTP 401 `Unauthorized`), berarti key di `.env`
salah/expired — bukan bug aplikasi. Server key tidak pernah dikirim ke browser.

Host/url dasar situs diambil dari `src/lib/site-url.ts` (`siteUrl()`): urutan
`SITE_URL` → `NEXT_PUBLIC_SITE_URL` → `AUTH_URL` → `http://localhost:3000`.

### Route

- `POST /api/checkout` — body `{ bookId }`. Membuat order `PENDING` (harga
  sudah IDR, pajak ikut sebagai item terpisah karena Midtrans mensyaratkan
  jumlah `item_details` = `gross_amount`), lalu membuat transaksi Snap dan
  mengembalikan `redirectUrl`. Buku gratis → order langsung `PAID` tanpa
  gateway. Sudah punya akses → `alreadyOwned`.
- `GET /api/payment/callback/[finish|cancel|error]` — **callback browser**
  dari Snap. Midtrans mengarahkan pembeli kembali ke sini dan menambah query
  param status. Query param **tidak dipercaya**: status diverifikasi ulang ke
  API Midtrans (server key), lalu order diarahkan ke
  `/akun/orders/<id>?pembayaran=berhasil|menunggu|gagal`. Kalau Midtrans tidak
  bisa dihubungi, order dibiarkan `PENDING` (webhook yang menutupinya).
- `POST /api/webhook/midtrans` — **notifikasi server-to-server**. Body resmi
  Midtrans (JSON) berisi `order_id`, `status_code`, `gross_amount` (bertitik,
  mis. `"10000.00"`), `transaction_status`, `fraud_status`, dan
  **`signature_key`** — bukan `signature`. Signature =
  `sha512(order_id + status_code + gross_amount + serverKey)`, dihitung dari
  nilai yang **persis dikirim** (jangan dibulatkan). Signature salah → 403.
  Body diterima JSON **dan** form-encoded. Order tak dikenal → dibalas 200
  (supaya Midtrans tidak mengulang notifikasi). `GET` = health check.
  Best practice Midtrans: transaksi dianggap lunas hanya kalau
  `status_code` 200 **dan** `fraud_status` = `accept` — kalau `fraud_status`
  lain (`challenge`/`reject`), order dibiarkan `PENDING`.
- `GET /api/payment/status/[orderId]` — cek status ke Midtrans (dipakai
  polling di `/akun/orders/[id]`). Order hanya boleh dicek pemiliknya atau admin.

### URL webhook

URL notifikasi Midtrans didaftarkan di **dashboard Midtrans → SETTINGS →
CONFIGURATION → "Payment Notification URL"** (bisa beberapa URL, pisahkan
dengan koma):

```
https://<domain-produksi>/api/webhook/midtrans
```

- Produksi: `https://arsippitaloka.com/api/webhook/midtrans`
- Lokal (tunnel ngrok): `https://<subdomain-ngrok>/api/webhook/midtrans` —
  tunnel harus hidup saat Midtrans mengirim notifikasi.

Domain produksi belum online → pakai ngrok. Saat uji lewat ngrok, set
`SITE_URL` ke URL tunnel juga: callback `callbacks.finish` dikirim ke browser
pembeli, dan URL yang lebih publik lebih aman kalau Midtrans memvalidasi
jangkauan URL.

Perilaku balasan webhook (aturan Midtrans): **2XX = sukses, tanpa retry**.
400/404 → retry 2×, 500 → retry 1×, 503 → retry 4×, kode lain → retry 5×.
Karena itu order yang tidak dikenal dibalas 200 (bukan 404) supaya Midtrans
tidak mengulang notifikasi tanpa henti.

### Uji bayar di sandbox

Kartu tes Midtrans sandbox (untuk bayar manual lewat halaman Snap):

| Nama | Nilai |
| --- | --- |
| Nomor kartu | `4811 1111 1111 1114` |
| CVV | `123` |
| Exp month | bulan apa saja, format `MM` |
| Exp year | tahun depan, format `YYYY` |
| OTP / 3DS | `112233` |

### Uji coba

```bash
npm run test:midtrans                    # checkout + Snap + webhook + pustaka
PUBLIC_URL=https://<ngrok> npm run test:midtrans   # webhook diuji via URL publik
npm run db:check:midtrans                # status konfigurasi (dari .env)
npm run db:check:midtrans -- --bersihkan # hapus sisa baris payment.midtrans.* di DB
npm run probe:midtrans                   # cek key diterima sandbox/production
npm run probe:midtrans:auth              # buktikan header Authorization = base64("ServerKey:")
```

Untuk membandingkan request yang kita kirim dengan sampel resmi Midtrans,
jalankan dev server dengan `MIDTRANS_DEBUG=1` — body request (tanpa server
key) ditulis ke `/tmp/midtrans-request.json` (ubah lokasi dengan
`MIDTRANS_DEBUG_FILE`).

### Uji alur penuh tanpa akun Midtrans (mock gateway)

`npm run test:midtrans:mock` menjalankan **seluruh alur pembayaran** di
lokal: mock gateway Midtrans (`scripts/midtrans-mock-gateway.ts`) +
dev server terpisah (port 3100, `NEXT_DIST_DIR=.next-mock`), lalu Checkout →
Snap → bayar → **webhook server-to-server** → finish callback → order PAID →
buku masuk Pustaka Saya.

- Mock hanya aktif lewat `MIDTRANS_SNAP_ENDPOINT` / `MIDTRANS_API_ENDPOINT`,
  dan **diabaikan saat `NODE_ENV=production`** (`src/lib/midtrans.ts` →
  `endpoints()`), jadi aplikasi yang ter-deploy tidak pernah mengirim
  transaksi ke host lain.
- `NEXT_DIST_DIR` (lihat `next.config.ts`) supaya dev server uji tidak
  bentrok dengan dev server utama.

### Simulasi pembayaran lewat browser (Playwright)

Playwright **tidak** jadi dependency proyek — hanya ada di cache npx, jadi
skripnya disalin ke direktori cache tersebut (wrapper sudah menguruskannya):

```bash
npm run test:midtrans:server   # nyalakan mock gateway + dev server uji (port 3100)
npm run test:midtrans:browser  # jalankan browser: daftar → login → Beli → bayar → Pustaka
```

`scripts/pw-payment-sim.mjs` menjalankan alur pembeli sungguhan di Chromium:
daftar akun → login → buka buku berbayar → klik **Beli** → halaman pembayaran
terbuka → bayar → kembali ke `/akun/orders/<id>?pembayaran=berhasil` (banner
"Pembayaran berhasil diterima", status Lunas) → buku ada di Pustaka Saya.
Screenshot disimpan ke `/tmp/pitaloka-assets/pw-*.png`.

- `MODE=mock` (default) → memakai mock gateway lokal.
- `MODE=real` → memakai halaman Snap **Midtrans sungguhan** (kartu tes
  `4811 1111 1111 1114`, CVV `123`, OTP/3DS `112233`). Butuh server key yang
  valid — cek dulu dengan `npm run probe:midtrans`.
- Data uji dibersihkan dengan `npm run db:cleanup:test-users`.

`scripts/midtrans-smoke.ts` membuat pembeli sementara, login, checkout,
membuka halaman Snap, menguji callback, mengirim notifikasi webhook (JSON +
form-encoded) dengan signature sah dari server key milik sendiri, memastikan
signature salah ditolak, lalu memastikan order jadi lunas dan bukunya masuk
Pustaka Saya. Kalau Midtrans menolak pembuatan transaksi (mis. key belum
benar), skrip **tetap menguji sisi penerimaan** dengan order `PENDING` lokal.
Data uji dibersihkan di akhir.

## Pagination

Setiap tabel/list di area admin dan area pembeli wajib memakai komponen
`src/components/Pagination.tsx` (query `?page=` dan `?per=`). Ukuran baris per
halaman: **5, 10, 25, 50** (default 10, minimal 5 — nilai lain diabaikan).
Helper parsing ada di `src/lib/pagination.ts` (`parsePage`, `parsePerPage`,
`clampPage`).

Paginasi dilakukan di server (Prisma `skip`/`take` + `count`), bukan di client.
Halaman yang sudah punya filter harus meneruskan filter itu ke `Pagination`
lewat prop `params` supaya tidak hilang saat pindah halaman. Baris yang sedang
diedit diambil terpisah dengan `findUnique` — bukan dari daftar baris halaman
sekarang — supaya edit tetap jalan walau barisnya ada di halaman lain.

Prisma `orderBy` menerima `{ field, dir }`, bukan `{ [field]: dir }` — ubah dulu sebelum meneruskan ke Prisma.

Hak akses file e-book (`/api/download/[bookId]`, `/api/read/[bookId]`): user harus punya order berstatus **PAID/SHIPPED/COMPLETED** untuk buku tersebut — tidak ada pengecualian untuk buku gratis (harus diklaim dulu, lihat "Hak akses & larangan membeli ulang"). File e-book hasil upload disimpan di `storage/private/` (di luar `public/`) supaya tidak bisa diakses langsung lewat URL — hanya lewat route di atas.

## CRUD admin generik

Definisi entitas ada di `src/lib/admin/entities.ts` — satu sumber kebenaran
label, kolom tabel, dan field form. Field bertipe khusus:

- `icon` — picker lucide-react (`src/components/admin/IconPicker.tsx`). Nilai
  disimpan PascalCase (mis. `BookOpen`). Resolusi nama ikon pakai
  `resolveIconName` di `src/lib/icon.ts`; nama kanonik lucide memakai
  kebab-case dan **bisa mengandung angka** (`building-2`), jadi konversi
  Pascal→kebab wajib memecah angka (`Building2` → `building-2`).
- `category` — kartu kategori + ikon (`src/components/admin/CategoryPicker.tsx`).
- `tiktok` — textarea + preview iframe (`src/components/admin/TikTokField.tsx`).

Field `slugFrom` diisi otomatis dari field sumber (live saat mengetik) dan
dibuat unik di server (`src/lib/admin/actions.ts` → `slugTaken`, suffix `-2`,
`-3`). Field `auto`/`autoFrom` terisi dari file yang diunggah: `format`,
`size`, `words`, `pages` (parser PDF tanpa dependency: `src/lib/pdf-meta.ts`).

Kolom yang **wajib di DB** harus punya `defaultValue` di definisi field,
dan `pruneEmpty` membuang nilai `null` supaya kolom wajib tidak gagal
disimpan. Contoh: `Category.order`, `ContentTab.order`, `Book.readCount`
wajib `defaultValue: 0`.

## Konten halaman utama dari konfigurasi admin

Teks/konten beranda (judul section, tombol, paragraf #ViralForJustice, isi
footer, dan lain-lain) **bukan hardcoded** — diambil dari tabel `SiteSetting`
lewat `getSettings()` di `src/lib/site-settings.ts`.

- Nilai bawaan ada di `src/lib/site-settings-defaults.ts` (sengaja tanpa
  import `next/cache`/Prisma supaya bisa dipakai `prisma/seed.ts` juga).
  Kalau nilai di DB kosong, halaman publik memakai nilai bawaan.
- Tambah key baru → tambahkan **di `DEFAULT_SETTINGS` sekaligus di
  `SETTINGS_SCHEMA`** (form admin membaca `SETTINGS_SCHEMA`).
- Setelah simpan di admin, `updateTag("content")` meng-invalidate cache →
  beranda langsung ikut berubah.
- Katalog ikon lucide hanya boleh dimuat di client. Resolusi nama ikon
  (`Building2` → `building-2`) ada di `src/components/icons/CatalogIcon.tsx`
  (komponen client). `src/lib/icon.ts` hanya berisi helper string, aman
  dipakai di Server Component.

## Video TikTok di beranda

Section `#ViralForJustice` (`src/components/home/ViralForJustice.tsx`) memuat
maksimal **3** video TikTok dari tabel `TiktokPost`:

- hanya baris `published = true`, urut `order` lalu `createdAt` terbaru;
- tiap slot menampilkan `<iframe src="https://www.tiktok.com/embed/v2/{videoId}">`
  + overlay caption (judul/author) yang menuju `https://www.tiktok.com/@i/video/{videoId}`;
- slot yang tidak terisi memakai poster `home.viral.image` dari SiteSetting.

Peng administeringannya lewat `/admin/tiktok` (CRUD generik, entitas `tiktok`).
Admin cukup menempelkan share link atau kode embed; `videoId`, `judul`, dan
`author` diambil otomatis (`src/lib/tiktok-oembed.ts` → `checkTikTokVideo`).
`TiktokPost` **tidak di-seed** — id video asli milik Pitaloka.

Pengecekan keberadaan video bersifat *best effort*: TikTok sering membatasi
akses (balasan 5xx / halaman shell), jadi statusnya bisa `unknown` — posting
tetap disimpan dan admin diberi tahu videonya belum bisa dicek. Hanya status
`notfound` (TikTok jelas menyatakan video tidak ada) yang ditolak.

Tambahan: field boolean pada CRUD admin generik harus dibaca dengan
`formData.getAll()` — memakai `get()` selalu mengembalikan hidden `"0"` dan
checkbox jadi selalu tersimpan `false`.

## SEO

Semua halaman publik punya metadata + structured data. Satu sumber
kebenarannya: **`src/lib/seo.ts`**.

| Berkas | Isi |
| --- | --- |
| `src/lib/seo.ts` | `buildMetadata()`, `absoluteUrl()`, `metaDescription()`, `breadcrumbJsonLd()`, `organizationJsonLd()`, `websiteJsonLd()` |
| `src/components/seo/JsonLd.tsx` | Komponen server `<JsonLd data={…} />` (JSON di-escape) |
| `src/components/seo/SiteJsonLd.tsx` | JSON-LD `Organization` + `WebSite` (SearchAction) — dipasang di root layout |
| `src/app/sitemap.ts` | Sitemap XML dinamis (beranda, katalog, kanal, kategori, buku, artikel, dokumentasi, media sosial) |
| `src/app/robots.ts` | robots.txt (area privat & auth ditutup; sitemap didaftarkan) |

Aturan wajib:

- **Judul halaman TIDAK memuat nama situs** — root layout memakai
  `title.template` (`"%s — Arsip Pitaloka"`). Menulis nama situs lagi akan
  jadi dobel ("… — Arsip Pitaloka — Arsip Pitaloka").
- **Canonical** selalu absolut (`absoluteUrl(path)`) dan **tanpa query
  string** — filter/paginasi katalog tidak boleh jadi URL terpisah.
- **Halaman auth, `/cari`, dan 404** → `noIndex: true`.
- **`generateMetadata` untuk halaman dinamis** memakai pola `"use cache"`
  (params-driven) — lihat `src/app/sosmed/[id]/page.tsx`. Halaman yang
  membaca cookie/searchParams **tidak** boleh memakai `"use cache"`.
- **JSON-LD per jenis konten**: `Book` (detail buku), `Article` (artikel &
  dokumentasi), `VideoObject` (media sosial), `CollectionPage` + `ItemList`
  (katalog/beranda), `AboutPage`, `ContactPage`, `BreadcrumbList` (semua
  halaman detail).
- **Pengecekan kepemilikan di UI tetap client-side** (lihat bagian "Hak
  akses & larangan membeli ulang") supaya halaman publik tetap bisa
  di-cache.

Perubahan metadata harus tetap lolos: `./node_modules/.bin/tsc --noEmit`
dan `npm run build`.

## Tailwind v4

Token tema didefinisikan di `src/app/globals.css` (`:root` + `@theme inline`). Hati-hati tabrakan nama dengan utilitas bawaan — token bernama `cover` menghasilkan `bg-cover` yang bentrok dengan `background-size: cover`. Itu sebabnya token warna sampul bernama `bookcover`, dan kartu buku memakai nilai literal `bg-[#3d2b2e]`.

Warna kunci: maroon `#561a1a`, maroon gelap `#3a1012`, sampul buku `#3d2b2e`.

## Layout mobile (penting)

Aturan main: **di layar kecil (<640px) gambar PDF tetap utuh** — tidak ada
teks yang digambar ulang sebagai HTML untuk hero/CTA. Yang dipotong hanya
*band navbar* di bagian atas gambar.

- **Header mobile** — `src/components/layout/SiteHeader.tsx` (client
  component): sticky, logo, cari, keranjang, akun, tombol hamburger, panel
  menu berisi link primer + kanal (`SITE_TABS`) + aksi auth. Target tap ≥44px.
  Header ini **tidak** diletakkan di root layout: `SiteHeader` sengaja tidak
  memakai `usePathname()` (kalau dipakai, `cacheComponents` gagal prerender
  dan seluruh route jadi dynamic). Karena itu header disisipkan per halaman
  publik: beranda, `/buku`, `/about`, `/news-and-views`, `/kontak`, `/cari`,
  `/keranjang`, `/artikel/*`, `/dokumentasi/*`, `/sosmed/*`, `/login`,
  `/register`, `/forgot-password`, `not-found`. **Tidak** di `/admin` dan
  `/akun` (keduanya sudah punya navigasi sendiri).
- **Crop band navbar** — `PdfHero` menerima prop `mobileCropPt` (default 0).
  Nilai standar ada di `src/components/layout/split-nav.ts` →
  `SPLIT_NAVBAR_CROP_PT = 140` (pt; label navbar occupy y 52–110 pt, logo
  berakhir ≈127 pt). Crop dihitung di JS lalu dipakai lewat CSS var
  `--pdf-hero-*` di `globals.css` (kelas `.pdf-hero` / `.pdf-hero-inner`).
  Overlay ikut ter-shift, jadi zona tautan tetap selaras.
- **Zona tautan di gambar** — `OverlayLinks` (`Zone`) punya field
  `hiddenOnMobile?: boolean` → zona disembunyikan `<sm` (`hidden sm:block`).
  Semua zona navbar PDF diberi flag ini. Menu kecil di gambar `/about` juga
  disembunyikan karena tautan yang sama sudah tampil sebagai chip HTML.
- **Cari di hero beranda** — kapsul pencarian di dalam gambar tidak bisa
  diketik di HP, jadi `MobileHeroSearch` (`src/components/home/`) menampilkan
  `SearchBar` HTML di bawah hero (hanya `sm:hidden`).
- Target tap kecil yang sudah diperbaiki: chip filter `/cari`, filter
  sidebar `/buku`, pill filter `/akun`, tombol Baca/Unduh pustaka, tombol
  `Ubah`/`Hapus` tabel admin, toolbar rich text, select paginasi,
  link "Fotget password".
- **Footer tidak menampilkan gambar**: logo perusahaan dihapus dari
  `src/components/home/Footer.tsx` — footer sekarang **maroon polos**
  (`bg-maroon-dark`). Logo tetap dipakai di navbar admin & structured data.

## Tombol di dalam kartu (sejajar & rapi)

Semua tombol aksi di dalam satu kartu harus **sejajar**: satu baris, tinggi
sama, menempel di dasar kartu.

- **Tinggi tetap `h-9`** (36px) untuk semua tombol aksi kartu: `AddToCartButton`,
  `BuyButton`, `FreeDownloadButton`, "Lihat Detail", "Baca selengkapnya →",
  "Lihat di TikTok", "Lihat buku", "Detail".
- **Tiap komponen tombol menerima `className` (untuk `<button>`) dan
  `wrapperClassName` (untuk pembungkus)**. Kartu mengatur lebar lewat
  `wrapperClassName="min-w-0 flex-1"` + `className="w-full"` — label di dalam
  `<span className="truncate">`, jadi teks panjang tidak memaksa tombol melebar.
- **Pembungkus konsisten**: `AddToCartButton` dibungkus `<div>`, jadi
  `BuyButton`/`FreeDownloadButton` juga harus dibungkus `<div>` — kalau tidak,
  tinggi baris tidak seragam.
- **Kartu sempit (2 kolom, ~173px di 390px)** — `ProductCard` memakai
  `AddToCartButton iconOnly` (ikon saja, `w-9`, ada `title`/`aria-label`)
  + `BuyButton label="Beli"` lebar penuh. Label "Keranjang" tidak muat di
  lebar segitu dan sempat membuat tombol terbelah ke dua baris.
- **Label tombol tidak boleh berubah panjang** (mis. "Keranjang" →
  "✓ Ditambahkan"): pakai label pendek supaya lebar tombol tidak meloncat.
- **Kartu wajib `flex h-full flex-col`** dengan badan `flex flex-1 flex-col`,
  dan baris harga/aksi memakai `mt-auto` — supaya tinggi antar-kartu sama dan
  tombol antar-kartu pada satu baris grid tidak bergeser.
- **Harga buku gratis** ditampilkan sebagai "Gratis", bukan `Rp0`.

Verifikasialignment cukup dengan mengukur `getBoundingClientRect()` tiap
tombol dalam satu kartu: `top` dan `height` harus sama.

## Verifikasi visual

Hook `rtk` di lingkungan ini rusak (`rtk: No such file or directory`), jadi panggil binary lokal langsung: `./node_modules/.bin/prisma`, `./node_modules/.bin/tsc`.

Screenshot halaman penuh pakai Playwright. Playwright **tidak** terpasang sebagai dependency proyek — hanya ada di cache npx, jadi script harus dijalankan dari dalam direktori cache itu (Node me-resolve `node_modules` dari lokasi script):

```bash
PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1)/../..
cp /tmp/pitaloka-assets/shot.mjs "$PW/shot.mjs"
(cd "$PW" && node shot.mjs http://localhost:3000)
rm -f "$PW/shot.mjs"
```

Script `shot.mjs` (viewport 1440×900, `fullPage: true`) menulis hasil ke `/tmp/pitaloka-assets/fullpage.png`. Kalau browser-nya belum ada, install versi yang cocok dari dalam direktori itu: `node node_modules/playwright-core/cli.js install chromium-headless-shell`.

Build bisa gagal dengan `Module not found: @vercel/turbopack-next/internal/font/google/font` setelah banyak rebuild beruntun — itu rate-limit unduhan Google Fonts, bukan bug kode. Tunggu sebentar lalu build ulang.

Patokan: tinggi halaman beranda **4879 px** di viewport 1440×900. Angka ini
ikut berubah bila konten seed berubah — seed sekarang berisi 6 buku, 17
artikel, 26 video, dan 4 entri dokumentasi (sebelumnya 7 buku, 7 artikel,
1 dokumentasi). Kalau berubah tanpa alasan jelas, ada regresi layout.
Di viewport 390×844 tinggi beranda sekitar **7155 px**.
(Tinggi turun ±40–50 px setelah logo dihapus dari footer — footer kini maroon
polos tanpa gambar.)

## Setelah mengubah UI

1. `./node_modules/.bin/tsc --noEmit`
2. `npm run build`
3. Restart dev bersih, screenshot, bandingkan dengan PDF
4. Cek log dev server bersih dari warning (`sizes` pada `<Image fill>`, dll.)

## Database

DB dev = PostgreSQL 16 di Docker, container `postgres-local`, **host port 5433** →
container 5432. Database: `riekeu_dyah_pitaloka_dev`, user `postgres`, password `postgres`.

```bash
docker ps                       # pastikan postgres-local jalan
./node_modules/.bin/prisma migrate dev   # apply migration
./node_modules/.bin/prisma db seed       # isi data + admin
npm run db:seed:admin           # seed/reset akun admin saja (idempotent)
npm run db:check                # tampilkan user + verifikasi hash password admin
npm run db:sample-book          # pasang file contoh ke seed-book-0 (unduh/baca)
npm run test:login-admin        # uji login admin lewat HTTP (csrf → callback → /admin)
```

Penting: **password admin harus selalu sinkron dengan `ADMIN_PASSWORD` di `.env`**.
Kalau hash di DB tidak cocok dengan `.env`, login gagal dengan `CredentialsSignin`
(lihat `scripts/check-db.ts` → bagian "UJI LOGIN ADMIN"). Perbaikan:
`npm run db:seed:admin` (membaca `.env`) — atau `npm run db:seed:admin -- --password=...`
kalau ingin password lain (perintah ini menimpa isi `.env`, jadi samakan keduanya).

`prisma/seed-admin.ts` membuat atau memperbarui satu akun ADMIN tanpa menyentuh
data lain. Urutan nilai: argumen CLI (`--email`, `--password`, `--name`,
`--keep-password`) → env `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Password di-reset hashed
baru (format `scrypt$N$r$p$salt$hash`) kecuali `--keep-password` dipakai.

Kredensial di `.env` (gitignored). Salinan tanpa nilai rahasia di `.env.example` (di-commit).

`prisma migrate dev`, `prisma db seed`, dan `prisma db push` menghapus/menulis data.
DB ini **milik sendiri** (bukan shared), jadi boleh dijalankan tanpa izin — tapi kalau
nanti `DATABASE_URL` diarahkan ke DB remote/shared, izin pengguna dulu.

## Bahasa

Komunikasi dengan pengguna memakai Bahasa Indonesia. Identifier kode tetap bahasa Inggris. Copy di UI mengikuti PDF persis (campuran Indonesia–Inggris).
