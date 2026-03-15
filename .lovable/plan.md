
# Tambah Fungsi Download Invoice di Halaman Member

## Ringkasan
Menambahkan tombol "Download Invoice" pada setiap kartu booking di halaman member dashboard. Tombol ini akan membuka dialog preview invoice yang sudah ada (`InvoicePreviewDialog`), di mana member bisa melihat preview dan download PDF invoice.

## Perubahan

### 1. `src/pages/user/MemberDashboard.tsx`
- Import komponen `InvoicePreviewDialog`, icon `FileText` dari lucide-react
- Tambah state untuk menyimpan booking yang dipilih untuk invoice (`selectedInvoiceBooking`)
- Tambah tombol **"Invoice"** di setiap kartu booking (aktif maupun riwayat) -- hanya tampil jika status booking bukan `cancelled` dan payment bukan `expired`
- Render `InvoicePreviewDialog` dengan data dari booking yang dipilih

### Detail Teknis

**State baru:**
```text
selectedInvoiceBooking: { id, booking_code, guest_name, guest_phone } | null
```

**Tombol Invoice** akan ditambahkan di:
- Kartu booking aktif (di samping tombol Batalkan)
- Kartu riwayat booking (untuk booking yang sudah checked_out / confirmed)

**Kondisi tampil:** Booking dengan status selain `cancelled` dan payment selain `expired`

### 2. `src/hooks/useBookingHistory.ts`
- Tambah field `guest_phone` ke interface `BookingHistoryItem` dan query select agar data nomor telepon tersedia untuk dialog invoice

## Alur Pengguna
1. Member buka dashboard --> lihat daftar booking
2. Klik tombol "Invoice" pada booking tertentu
3. Dialog preview invoice muncul dengan data booking
4. Member bisa download PDF atau kirim via WhatsApp
