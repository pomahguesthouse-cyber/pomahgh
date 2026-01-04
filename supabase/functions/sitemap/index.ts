import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://pomahguesthouse.com';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating dynamic sitemap...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('slug, updated_at')
      .eq('available', true)
      .order('created_at', { ascending: false });

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
    }

    // Fetch active city attractions
    const { data: attractions, error: attractionsError } = await supabase
      .from('city_attractions')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (attractionsError) {
      console.error('Error fetching attractions:', attractionsError);
    }

    const today = new Date().toISOString().split('T')[0];

    // Build XML sitemap
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Static pages -->
  <url>
    <loc>${SITE_URL}/explore</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/bookings</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    // Add room pages
    if (rooms && rooms.length > 0) {
      xml += '\n  <!-- Room pages -->\n';
      for (const room of rooms) {
        if (room.slug) {
          const lastmod = room.updated_at ? new Date(room.updated_at).toISOString().split('T')[0] : today;
          xml += `  <url>
    <loc>${SITE_URL}/rooms/${room.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
        }
      }
    }

    // Add city attraction pages
    if (attractions && attractions.length > 0) {
      xml += '\n  <!-- City attraction pages -->\n';
      for (const attraction of attractions) {
        if (attraction.slug) {
          const lastmod = attraction.updated_at ? new Date(attraction.updated_at).toISOString().split('T')[0] : today;
          xml += `  <url>
    <loc>${SITE_URL}/explore/${attraction.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        }
      }
    }

    xml += '</urlset>';

    console.log(`Sitemap generated with ${(rooms?.length || 0) + (attractions?.length || 0) + 3} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    );
  }
});
