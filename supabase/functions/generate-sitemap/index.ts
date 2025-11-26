import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch SEO settings
    const { data: seoSettings } = await supabase
      .from('seo_settings')
      .select('*')
      .single();

    // Fetch all available rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('slug, updated_at')
      .eq('available', true);

    const baseUrl = seoSettings?.canonical_url || 'https://pomahguesthouse.com';
    const changefreq = seoSettings?.sitemap_change_freq || 'weekly';
    const priorityHome = seoSettings?.sitemap_priority_home || 1.0;
    const priorityRooms = seoSettings?.sitemap_priority_rooms || 0.8;

    // Generate sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}</loc>\n`;
    xml += `    <priority>${priorityHome}</priority>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += '  </url>\n';

    // Auth page
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/auth</loc>\n`;
    xml += '    <priority>0.6</priority>\n';
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += '  </url>\n';

    // Bookings page
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/bookings</loc>\n`;
    xml += '    <priority>0.7</priority>\n';
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += '  </url>\n';

    // Room detail pages
    if (rooms && rooms.length > 0) {
      for (const room of rooms) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/rooms/${room.slug}</loc>\n`;
        xml += `    <priority>${priorityRooms}</priority>\n`;
        xml += `    <changefreq>${changefreq}</changefreq>\n`;
        if (room.updated_at) {
          xml += `    <lastmod>${new Date(room.updated_at).toISOString().split('T')[0]}</lastmod>\n`;
        }
        xml += '  </url>\n';
      }
    }

    xml += '</urlset>';

    console.log('Generated sitemap with', (rooms?.length || 0) + 3, 'URLs');

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
