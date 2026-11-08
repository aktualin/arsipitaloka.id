/**
 * Pratinjau email notifikasi order TANPA mengirim email dan TANPA menyentuh
 * database — dipakai untuk memeriksa isi & tampilan email konfirmasi.
 *
 *   npx tsx scripts/order-email-preview.ts
 *
 * Hasil HTML ditulis ke /tmp/pitaloka-assets/order-email-preview.html
 * (buka di browser), versi teks dicetak ke terminal.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { orderConfirmationMail } from "../src/lib/mail/templates";

function main() {
  const mail = orderConfirmationMail({
    orderNumber: "A1B2C3D4",
    buyerName: "Rizky Pratama",
    lines: [
      { title: "Renungan Kloset", qty: 1, amount: 65_000 },
      { title: "Ups!", qty: 1, amount: 70_000 },
    ],
    subtotal: 135_000,
    taxAmount: 11_000,
    total: 146_000,
    paymentMethod: "SNAP (midtrans)",
    paidAt: new Date("2026-03-14T09:30:00.000Z"),
    orderUrl: "http://localhost:3000/akun/orders/contoh-order-1234",
    isFree: false,
  });

  const freeMail = orderConfirmationMail({
    orderNumber: "FREE1234",
    buyerName: "Siti Aminah",
    lines: [{ title: "Panduan e-Voting untuk_User", qty: 1, amount: 0 }],
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    paymentMethod: "Gratis",
    paidAt: new Date("2026-03-14T09:30:00.000Z"),
    orderUrl: "http://localhost:3000/akun/orders/contoh-order-gratis",
    isFree: true,
  });

  const dir = "/tmp/pitaloka-assets";
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/order-email-preview.html`, mail.html);
  writeFileSync(`${dir}/order-email-preview-free.html`, freeMail.html);

  console.log("=== Versi teks (order berbayar) ===");
  console.log(mail.text);
  console.log("");
  console.log("=== Versi teks (order gratis) ===");
  console.log(freeMail.text);
  console.log("");
  console.log(`HTML: ${dir}/order-email-preview.html`);
  console.log(`HTML: ${dir}/order-email-preview-free.html`);
}

main();
