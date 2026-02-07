# Room Autopricing Implementation

## Ringkasan

Sistem telah ditambahkan fitur untuk mengaktifkan autopricing per kamar. Jika fitur ini diaktifkan, harga kamar akan menggunakan harga dari `price_cache` (hasil autopricing calculation) sebagai pengganti `price_per_night`.

## Fitur Baru

### 1. Database Schema
- **Tabel**: `rooms`
- **Kolom Baru**: `use_autopricing` (BOOLEAN, DEFAULT false)
- **Migration**: `20250207000003_add_use_autopricing_column.sql`

### 2. UI Components

#### AdminRooms.tsx
- Toggle switch "Gunakan AutoPricing" di form edit/create room
- Badge "AutoPricing" dengan icon Zap di room list jika aktif
- Pesan informasi: "Jika aktif, harga kamar akan otomatis menyesuaikan berdasarkan occupancy dan demand"

#### Room List Display
```
[Nama Kamar]                    [Available/Unavailable]
Rp 500,000/night ⚡ AutoPricing
```

### 3. Logic Implementation

#### useRooms.tsx
- Interface `Room` ditambahkan field `use_autopricing?: boolean | null`
- Function `getCurrentPrice()` diupdate untuk menerima parameter `autoPricingPrice`
- Query diperbarui untuk fetch data dari `price_cache` untuk rooms dengan `use_autopricing = true`
- Priority harga:
  1. Room promotions (highest)
  2. Legacy promo fields
  3. **AutoPricing (NEW)**
  4. Day-of-week pricing
  5. Base price (lowest)

#### Price Cache Query
```typescript
if (roomsWithAutopricing.length > 0) {
  const { data: priceCacheData } = await supabase
    .from('price_cache')
    .select('room_id, price_per_night')
    .in('room_id', roomsWithAutopricing.map(r => r.id))
    .eq('date', today)
    .gt('valid_until', new Date().toISOString());
}
```

## Cara Menggunakan

### Mengaktifkan Autopricing untuk Kamar

1. **Buka Admin Rooms**
   - Navigasi ke Admin → Rooms

2. **Edit atau Tambah Kamar**
   - Klik "Edit" pada kamar yang ingin diaktifkan autopricing
   - Atau klik "Add Room" untuk kamar baru

3. **Aktifkan Toggle**
   - Scroll ke bagian bawah form
   - Cari section "Gunakan AutoPricing"
   - Aktifkan toggle switch
   - Klik "Update Room" atau "Create Room"

4. **Verifikasi**
   - Di room list, akan muncul badge "⚡ AutoPricing" di bawah harga
   - Harga yang ditampilkan akan mengikuti harga dari autopricing system

### Prerequisites

Pastikan sudah di-deploy:
1. ✅ `pricing-processor` edge function
2. ✅ `price_cache` table dengan data
3. ✅ Cron job untuk update price_cache secara berkala

### Alur Kerja

```
User melihat harga kamar
    ↓
useRooms hook fetch data
    ↓
Cek use_autopricing = true?
    ↓ YA
Fetch price dari price_cache
    ↓
Tampilkan harga autopricing
    ↓
Update otomatis setiap 5 menit (via cron)
```

## Database Changes

### Migration File
**File**: `supabase/migrations/20250207000003_add_use_autopricing_column.sql`

```sql
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS use_autopricing BOOLEAN DEFAULT false;

UPDATE rooms SET use_autopricing = false WHERE use_autopricing IS NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_use_autopricing ON rooms(use_autopricing);
```

## Files Modified

1. ✅ `supabase/migrations/20250207000003_add_use_autopricing_column.sql`
2. ✅ `src/pages/admin/AdminRooms.tsx`
3. ✅ `src/hooks/useRooms.tsx`
4. ✅ `src/hooks/useAdminRooms.tsx` (tidak perlu modifikasi, sudah handle all fields)

## Testing

### Test 1: Aktivasi Autopricing
```sql
-- Update room untuk menggunakan autopricing
UPDATE rooms 
SET use_autopricing = true 
WHERE id = 'room-id-anda';

-- Cek apakah data muncul di UI
-- Seharusnya ada badge "⚡ AutoPricing"
```

### Test 2: Verifikasi Harga
```sql
-- Cek harga di price_cache
SELECT room_id, price_per_night, valid_until 
FROM price_cache 
WHERE room_id = 'room-id-anda' 
AND date = CURRENT_DATE;

-- Bandingkan dengan harga yang muncul di website
-- Seharusnya sama
```

### Test 3: Update Otomatis
1. Ubah occupancy (buat booking baru)
2. Tunggu pricing-processor berjalan (5 menit)
3. Cek price_cache berubah
4. Refresh website, harga seharusnya update

## Troubleshooting

### Badge AutoPricing tidak muncul
- Cek di database: `SELECT use_autopricing FROM rooms WHERE id = 'room-id'`
- Pastikan value adalah `true`
- Clear browser cache

### Harga tidak update
- Cek price_cache ada data: `SELECT * FROM price_cache WHERE room_id = 'room-id'`
- Cek valid_until masih berlaku: `valid_until > NOW()`
- Cek pricing-processor berjalan: Lihat logs di Supabase Dashboard

### Harga 0 atau null
- Pastikan auto-pricing system sudah berjalan
- Cek base_price di rooms table tidak null
- Jalankan manual: `SELECT calculate_real_time_price('room-id', CURRENT_DATE)`

## Integration dengan Sistem Existing

### Compatibility
- ✅ Tetap mendukung promo_price (highest priority)
- ✅ Tetap mendukung day-of-week pricing
- ✅ Tetap mendukung base_price sebagai fallback
- ✅ Tidak merusak booking existing

### Edge Cases
1. **Price cache expired**: Fallback ke price_per_night
2. **No price cache data**: Fallback ke price_per_night
3. **Promo aktif**: Promo price tetap priority (override autopricing)
4. **Booking created**: Harga booking tetap sesuai saat booking dibuat

## Future Enhancements

1. **Minimum/Maximum Price**: Add min_price dan max_price per room untuk autopricing
2. **Override per Date**: Bisa disable autopricing untuk tanggal tertentu
3. **Percentage Cap**: Batasi perubahan harga autopricing (e.g., max ±30%)
4. **Notify on Change**: Notifikasi ke admin jika autopricing mengubah harga signifikan

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-02-07
**Framework**: React + TypeScript + Supabase
