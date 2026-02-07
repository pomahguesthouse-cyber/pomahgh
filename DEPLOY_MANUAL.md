# Deploy Pricing Processor - Manual Instructions

## Cara Termudah: Via Supabase Dashboard

### Step 1: Buka Supabase Dashboard
1. Login ke https://app.supabase.com
2. Pilih project hotel Anda
3. Klik menu **Edge Functions** di sidebar kiri

### Step 2: Create New Function
1. Klik tombol **"New Function"** (warna hijau)
2. **Function name**: `pricing-processor`
3. **Copy** kode di bawah ini:

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting pricing event processor...');

    // Get unprocessed events
    const { data: events, error: fetchError } = await supabase
      .from('pricing_events')
      .select('*')
      .eq('processed', false)
      .lt('retry_count', 3)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) throw fetchError;

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No events to process',
          result: { events_processed: 0, prices_updated: 0, approvals_created: 0, errors: 0, processing_time_ms: Date.now() - startTime }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0, pricesUpdated = 0, approvalsCreated = 0, errors = 0;

    for (const event of events) {
      try {
        // Mark as processing
        await supabase.from('pricing_events').update({
          processing_started_at: new Date().toISOString(),
          status: 'processing'
        }).eq('id', event.id);

        // Process based on event type
        if (event.event_type === 'booking_change' || event.event_type === 'occupancy_update') {
          const result = await processOccupancyEvent(supabase, event);
          if (result.priceUpdated) pricesUpdated++;
          if (result.approvalCreated) approvalsCreated++;
        }

        // Mark as completed
        await supabase.from('pricing_events').update({
          processed: true,
          processing_completed_at: new Date().toISOString(),
          status: 'completed'
        }).eq('id', event.id);

        processed++;
      } catch (error) {
        errors++;
        await supabase.from('pricing_events').update({
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: event.retry_count + 1,
          status: event.retry_count + 1 >= 3 ? 'failed' : 'pending'
        }).eq('id', event.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processed} events`,
        result: { events_processed: processed, prices_updated: pricesUpdated, approvals_created: approvalsCreated, errors: errors, processing_time_ms: Date.now() - startTime }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processOccupancyEvent(supabase: any, event: any) {
  // Get room data
  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, base_price, price_per_night, min_auto_price, max_auto_price, auto_pricing_enabled')
    .eq('id', event.room_id)
    .single();

  if (!room || !room.auto_pricing_enabled) {
    return { priceUpdated: false, approvalCreated: false };
  }

  // Calculate occupancy
  const { data: occupancyData } = await supabase.rpc('calculate_real_time_occupancy', {
    p_room_id: event.room_id,
    p_date: new Date().toISOString().split('T')[0]
  });

  if (!occupancyData || occupancyData.length === 0) {
    return { priceUpdated: false, approvalCreated: false };
  }

  const occupancy = occupancyData[0];
  
  // Calculate multiplier
  let multiplier = 1.0;
  if (occupancy.occupancy_rate >= 95) multiplier = 1.5;
  else if (occupancy.occupancy_rate >= 85) multiplier = 1.3;
  else if (occupancy.occupancy_rate >= 70) multiplier = 1.15;
  else if (occupancy.occupancy_rate <= 30) multiplier = 0.85;

  const basePrice = room.base_price || room.price_per_night;
  const newPrice = Math.round((basePrice * multiplier) / 10000) * 10000;

  if (newPrice === basePrice) {
    return { priceUpdated: false, approvalCreated: false };
  }

  // Apply constraints
  let finalPrice = newPrice;
  if (room.min_auto_price && finalPrice < room.min_auto_price) finalPrice = room.min_auto_price;
  if (room.max_auto_price && finalPrice > room.max_auto_price) finalPrice = room.max_auto_price;

  const changePercentage = Math.abs((finalPrice - basePrice) / basePrice * 100);

  // Check if approval needed
  if (changePercentage > 10) {
    await supabase.from('price_approvals').insert({
      room_id: event.room_id,
      old_price: basePrice,
      new_price: finalPrice,
      price_change_percentage: changePercentage,
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      pricing_factors: { occupancy_rate: occupancy.occupancy_rate, demand_score: occupancy.demand_score }
    });

    // Send WhatsApp notification
    await sendWhatsAppNotification(supabase, room, basePrice, finalPrice, occupancy);

    return { priceUpdated: false, approvalCreated: true };
  }

  // Auto-approve small changes
  await supabase.from('rooms').update({ base_price: finalPrice }).eq('id', event.room_id);
  await supabase.from('pricing_adjustment_logs').insert({
    room_id: event.room_id,
    previous_price: basePrice,
    new_price: finalPrice,
    adjustment_reason: `Occupancy-based: ${occupancy.occupancy_rate.toFixed(1)}%`,
    adjustment_type: 'auto'
  });

  return { priceUpdated: true, approvalCreated: false };
}

async function sendWhatsAppNotification(supabase: any, room: any, oldPrice: number, newPrice: number, occupancy: any) {
  try {
    const { data: settings } = await supabase.from('hotel_settings').select('whatsapp_number, hotel_name').single();
    if (!settings?.whatsapp_number) return;

    const changePercent = ((newPrice - oldPrice) / oldPrice * 100);
    const direction = changePercent > 0 ? '⬆️' : '⬇️';

    const message = `🔄 *PRICE CHANGE APPROVAL NEEDED*

🏨 ${settings.hotel_name}
🛏️ Room: ${room.name}
${direction} Change: ${Math.abs(changePercent).toFixed(1)}%

💰 Price Details:
• Old: Rp ${oldPrice.toLocaleString('id-ID')}
• New: Rp ${newPrice.toLocaleString('id-ID')}

📊 Triggered by:
• Occupancy: ${occupancy.occupancy_rate.toFixed(1)}%

🔘 Reply to approve:
APPROVE ${room.id}

🔘 Reply to reject:
REJECT ${room.id} [reason]

⏰ Expires in 30 minutes`;

    await supabase.functions.invoke('send-whatsapp', {
      body: { phone: settings.whatsapp_number, message: message, type: 'admin' }
    });
  } catch (error) {
    console.error('WhatsApp notification error:', error);
  }
}
```

### Step 3: Deploy
1. **Paste** kode di atas ke editor
2. Klik tombol **"Deploy"** (kanan atas)
3. Tunggu sampai deploy selesai (biasanya 10-30 detik)

### Step 4: Setup Cron Job
1. Buka **SQL Editor** di Supabase Dashboard
2. Jalankan SQL ini:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create helper function to get project URL
CREATE OR REPLACE FUNCTION get_project_url()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.settings.supabase_url', true);
END;
$$ LANGUAGE plpgsql;

-- Schedule pricing-processor every 5 minutes
SELECT cron.schedule(
  'pricing-processor',
  '*/5 * * * *',
  'SELECT net.http_post(
    url := current_setting(''app.settings.supabase_url'', true) || ''/functions/v1/pricing-processor'',
    headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.supabase_anon_key'', true))
  )'
);

-- Verify cron job created
SELECT * FROM cron.job WHERE jobname = 'pricing-processor';
```

### Step 5: Test
1. Buka **Edge Functions** → **pricing-processor**
2. Klik tab **"Logs"**
3. Klik **"Invoke"** atau tunggu cron job berjalan (setiap 5 menit)
4. Cek logs untuk memastikan berjalan dengan baik

---

## Troubleshooting

### Error: "Function not found"
- Pastikan nama function: `pricing-processor` (tanpa typo)
- Cek di Edge Functions list

### Error: "Permission denied"
- Function sudah deployed tapi belum ada permission
- Tambahkan ini di SQL Editor:
```sql
GRANT EXECUTE ON FUNCTION pricing-processor TO anon, authenticated, service_role;
```

### Cron Job tidak berjalan
- Cek extension pg_cron sudah di-enable:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```
- Check cron jobs:
```sql
SELECT * FROM cron.job;
```

### WhatsApp notifikasi tidak terkirim
- Pastikan FONNTE_API_KEY sudah di-set di Supabase Secrets:
```bash
npx supabase secrets set FONNTE_API_KEY=your_api_key
```
- Atau set via Dashboard: Project Settings → Secrets → New Secret

---

## Quick Test

Setelah deploy, test dengan:
```bash
# Via curl
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/pricing-processor \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Note:** Replace [PROJECT_REF] dan [ANON_KEY] dengan values dari project Anda (bisa ditemukan di Project Settings → API)

---

## ✅ Verifikasi Sukses

Jika berhasil, Anda akan melihat:
1. ✅ Function muncul di Edge Functions list
2. ✅ Logs menunjukkan "Starting pricing event processor"
3. ✅ Cron job muncul di `SELECT * FROM cron.job`
4. ✅ WhatsApp approval notifikasi terkirim (jika ada pending approval)
