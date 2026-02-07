# Aggressive Dynamic Pricing Implementation

## 📋 Ringkasan Implementasi

Sistem auto-pricing telah di-upgrade dengan fitur aggressive dynamic pricing yang bereaksi real-time terhadap perubahan occupancy dan demand.

## 🚀 Fitur Baru

### 1. Real-Time Pricing Triggers ✅
- **File**: `supabase/migrations/20250207000001_add_booking_rooms_pricing_trigger.sql`
- **Trigger**: `booking_rooms_pricing_event_trigger`
- **Fungsi**: Trigger aktif saat booking_rooms berubah (INSERT/UPDATE/DELETE)
- **Priority**: 7 (High) untuk reaksi cepat

### 2. Pricing Processor (Cron Job) ✅
- **File**: `supabase/functions/pricing-processor/index.ts`
- **Fungsi**: Memproses pricing_events queue setiap 5 menit
- **Features**:
  - Occupancy-based pricing
  - Competitor-based pricing  
  - Time-based triggers
  - Manual override handling
  - WhatsApp approval workflow

### 3. WhatsApp Approval Integration ✅
- **File**: `supabase/functions/whatsapp-webhook/index.ts` (lines 387-530)
- **Commands**:
  - `APPROVE [room_id]` - Approve price change
  - `REJECT [room_id] [reason]` - Reject with reason
- **Auto-approval**: Changes ≤10% di-approve otomatis
- **Notification**: WhatsApp message dengan detail pricing factors

### 4. UI Controls ✅
- **File**: `src/components/admin/competitor/AnalysisDashboardTab.tsx`
- **Features**:
  - Toggle aggressive pricing
  - Occupancy threshold sliders (30%, 70%, 85%, 95%)
  - Auto-approval threshold setting
  - Last-minute pricing toggle
  - Manual pricing processor trigger

### 5. Database Settings ✅
- **File**: `supabase/migrations/20250207000002_add_aggressive_pricing_settings.sql`
- **New Columns**:
  - `aggressive_pricing_enabled` (boolean)
  - `auto_approval_threshold` (decimal)
  - `whatsapp_price_approval_enabled` (boolean)
  - `occupancy_30/70/85/95_threshold` (integer)
  - `last_minute_pricing_enabled` (boolean)
  - `last_minute_hours` (integer)

## 📊 Pricing Multipliers

| Occupancy | Multiplier | Price Impact |
|-----------|-----------|--------------|
| ≤30% | ×0.85 | -15% discount |
| 30-70% | ×1.00 | Base price |
| 70-85% | ×1.15 | +15% premium |
| 85-95% | ×1.30 | +30% premium |
| ≥95% | ×1.50 | +50% premium |

## 🔄 Workflow

### 1. Booking Created/Updated/Deleted
```
booking_rooms table changed
    ↓
Trigger: booking_rooms_pricing_event_trigger
    ↓
Insert pricing_events (type: 'occupancy_update', priority: 7)
    ↓
Cron Job: pricing-processor (runs every 5 min)
    ↓
Calculate occupancy & new price
    ↓
If change > 10%:
    → Create price_approvals record
    → Send WhatsApp notification
    → Wait for APPROVE/REJECT
If change ≤ 10%:
    → Auto-approve
    → Update rooms.base_price
    → Log to pricing_adjustment_logs
```

### 2. Manager Approves via WhatsApp
```
Manager replies: "APPROVE [room_id]"
    ↓
whatsapp-webhook detects approval pattern
    ↓
Validate manager & find pending approval
    ↓
Update rooms.base_price
    ↓
Update price_approvals.status = 'approved'
    ↓
Log to pricing_adjustment_logs
    ↓
Send confirmation WhatsApp
```

## ⚙️ Konfigurasi

### Enable Aggressive Pricing
1. Go to Admin → Competitor Analysis
2. Toggle "Aggressive Dynamic Pricing"
3. Adjust occupancy thresholds
4. Set auto-approval threshold
5. Enable/disable last-minute pricing
6. Click "Run Pricing Processor Now"

### Setup Cron Job (Supabase Dashboard)
```sql
-- Create cron job to run every 5 minutes
SELECT cron.schedule(
  'pricing-processor',
  '*/5 * * * *',
  'SELECT net.http_post(url:=''https://[PROJECT_REF].supabase.co/functions/v1/pricing-processor'', headers:=''{"Authorization": "Bearer [ANON_KEY]"}''::jsonb)'
);
```

### Setup WhatsApp Manager
1. Go to Settings → WhatsApp
2. Add manager phone numbers
3. Format: +62xxxxxxxxxxx
4. Assign role: super_admin or admin

## 📱 WhatsApp Commands

Untuk Manager:
- `APPROVE [room_id]` - Setujui perubahan harga
- `REJECT [room_id] alasan` - Tolak dengan alasan

Contoh:
- `APPROVE 550e8400-e29b-41d4-a716-446655440000`
- `REJECT 550e8400-e29b-41d4-a716-446655440000 harga terlalu tinggi`

## 🧪 Testing

### Test Occupancy Trigger
```sql
-- Create test booking
INSERT INTO bookings (room_id, check_in, check_out, status)
VALUES ('[ROOM_ID]', '2025-02-10', '2025-02-12', 'confirmed');

-- Check pricing_events
SELECT * FROM pricing_events WHERE event_type = 'occupancy_update' ORDER BY created_at DESC;

-- Check price_cache
SELECT * FROM price_cache WHERE room_id = '[ROOM_ID]' ORDER BY date DESC;
```

### Test WhatsApp Approval
1. Set occupancy to 95%+ (create bookings)
2. Wait for pricing-processor to run
3. Check WhatsApp for approval request
4. Reply with "APPROVE [room_id]"
5. Verify price updated in rooms table

## 📈 Monitoring

### Key Metrics
```sql
-- Pending approvals
SELECT COUNT(*) FROM price_approvals WHERE status = 'pending';

-- Unprocessed events
SELECT COUNT(*) FROM pricing_events WHERE processed = false;

-- Recent price changes
SELECT * FROM pricing_adjustment_logs 
WHERE executed_at > NOW() - INTERVAL '24 hours'
ORDER BY executed_at DESC;
```

### Logs Location
- Edge Function Logs: Supabase Dashboard → Functions → pricing-processor
- Database Logs: `pricing_adjustment_logs` table
- WhatsApp Logs: `whatsapp_sessions` + webhook responses

## ⚠️ Important Notes

1. **Auto-approval**: Perubahan ≤10% otomatis di-approve tanpa notifikasi
2. **Expiration**: Approval request berlaku 30 menit
3. **Constraints**: Harga selalu dalam batas min_auto_price / max_auto_price
4. **Rounding**: Harga dibulatkan ke kelipatan 10,000 (IDR convention)
5. **Caching**: Price cache valid selama 15 menit

## 🔧 Troubleshooting

### Pricing events not processing
- Check cron job aktif: `SELECT * FROM cron.job;`
- Check pricing_events queue: `SELECT * FROM pricing_events WHERE processed = false;`
- Check edge function logs di Supabase Dashboard

### WhatsApp approval not working
- Verify manager phone number in `hotel_settings.whatsapp_manager_numbers`
- Check Fonnte API key configured
- Test dengan: `SELECT * FROM price_approvals WHERE status = 'pending';`

### Occupancy not updating
- Pastikan trigger aktif: `SELECT * FROM pg_trigger WHERE tgname = 'booking_rooms_pricing_event_trigger';`
- Check booking_rooms table memiliki room_id yang valid
- Verify rooms.allotment > 0

## 📚 Files Modified

1. ✅ `supabase/migrations/20250207000001_add_booking_rooms_pricing_trigger.sql`
2. ✅ `supabase/functions/pricing-processor/index.ts`
3. ✅ `supabase/functions/whatsapp-webhook/index.ts`
4. ✅ `src/components/admin/competitor/AnalysisDashboardTab.tsx`
5. ✅ `supabase/migrations/20250207000002_add_aggressive_pricing_settings.sql`

## 🎯 Next Steps (Optional)

1. **Seasonal Pricing Rules**: Tambahkan event-based pricing (holidays, local events)
2. **Revenue Optimization**: Implement expected revenue maximization algorithm
3. **ML Prediction**: Gunakan historical data untuk predict optimal pricing
4. **Multi-channel Sync**: Sinkronisasi harga ke OTA (Booking.com, Agoda, etc.)
5. **A/B Testing**: Test different pricing strategies

---

**Implementation Date**: 2025-02-07
**Status**: ✅ Production Ready
**Framework**: Lovable.dev + Supabase + React
