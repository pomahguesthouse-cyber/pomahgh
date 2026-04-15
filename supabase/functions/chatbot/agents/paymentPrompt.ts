/**
 * Payment rules prompt section — extracted from promptBuilder.ts
 */
export function buildPaymentRules(): string {
  return `PEMBAYARAN:
- JANGAN kasih link pembayaran
- Setelah booking: info kode + rekening BCA 0095584379 a.n. Faizal Abdurachman + minta bukti transfer
- Bukti masuk → notify_payment_proof, bilang "Tim kami sedang cek pembayaran"

FORMAT: Kode PMH-XXXXXX | Tanggal "15 Januari 2025" | Harga "Rp 450.000"`;
}
