# Badge "Pending Konfirmasi" untuk `pay_at_hotel`

## Changes
- `PAYMENT_STATUS_LABELS.pay_at_hotel` → `"Pending Konfirmasi"`
- **Otomatis update** di:
  - Admin bookings table (AccordionItem)
  - Booking calendar (BookingCalendarTable)
  - Edit dialogs
  - Export PDF/Excel

## Visual
```
Sebelum: "Bayar di Hotel" (biru)
Sesudah: "Pending Konfirmasi" (biru)
```

## Why
- Lebih jelas untuk admin — menekankan perlu konfirmasi saat check-in
- Centralized change — 1 line affect semua UI

**Test:** `/admin/bookings` → cari booking `pay_at_hotel` → badge berubah
