#!/bin/bash
# Deploy Script untuk Pricing Processor
# Jalankan di terminal lokal Anda

echo "🚀 Deploy Pricing Processor ke Supabase"
echo "========================================"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI belum terinstall"
    echo "Install dengan: npm install -g supabase"
    exit 1
fi

# Check login
if ! supabase projects list &> /dev/null; then
    echo "🔑 Silakan login ke Supabase:"
    echo "npx supabase login"
    exit 1
fi

# Link project jika belum
if [ ! -f "supabase/config.toml" ]; then
    echo "🔗 Link project Supabase..."
    echo "Masukkan Project Ref (dari URL Supabase):"
    read PROJECT_REF
    npx supabase link --project-ref $PROJECT_REF
fi

# Deploy function
echo "📦 Deploy pricing-processor function..."
npx supabase functions deploy pricing-processor

# Set environment variables
echo ""
echo "⚙️  Set Environment Variables:"
echo "npx supabase secrets set FONNTE_API_KEY=your_fonnte_api_key"
echo ""

# Setup cron job
echo "⏰ Setup Cron Job (jalankan di SQL Editor):"
cat << 'EOF'
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule pricing-processor every 5 minutes
SELECT cron.schedule(
  'pricing-processor',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://' || (SELECT decodelink_settings->>'project_ref' FROM decodelink_settings LIMIT 1) || '.supabase.co/functions/v1/pricing-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decodelink_settings->>'anon_key' FROM decodelink_settings LIMIT 1),
      'Content-Type', 'application/json'
    )
  )$$
);
EOF

echo ""
echo "✅ Deploy selesai!"
echo ""
echo "📖 Next Steps:"
echo "1. Test function di Supabase Dashboard → Functions"
echo "2. Jalankan migration: npx supabase db push"
echo "3. Cek logs: npx supabase functions logs pricing-processor"
