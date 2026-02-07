import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Place ID from hotel_settings
    const { data: settings, error: settingsError } = await supabase
      .from('hotel_settings')
      .select('google_place_id')
      .limit(1)
      .single();

    if (settingsError || !settings?.google_place_id) {
      console.error('Place ID not found:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Google Place ID not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const placeId = settings.google_place_id;
    console.log('Fetching rating for Place ID:', placeId);

    // Fetch from Google Places API v1 (New) - include reviews
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount,googleMapsUri,reviews`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': googleApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google rating', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const placeData = await response.json();
    console.log('Google Places API response:', placeData);

    interface GoogleReview {
      rating: number;
      authorAttribution?: { displayName?: string; photoUri?: string };
      text?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
    }

    // Filter reviews with rating >= 4 and map to simplified structure
    const reviews = ((placeData.reviews || []) as GoogleReview[])
      .filter((review) => review.rating >= 4)
      .slice(0, 5)
      .map((review) => ({
        authorName: review.authorAttribution?.displayName || 'Anonim',
        authorPhoto: review.authorAttribution?.photoUri || null,
        rating: review.rating,
        text: review.text?.text || '',
        relativeTime: review.relativePublishTimeDescription || '',
        publishTime: review.publishTime || null,
      }));

    const result = {
      rating: placeData.rating || null,
      reviewCount: placeData.userRatingCount || 0,
      googleMapsUrl: placeData.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      reviews: reviews,
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in get-google-rating:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
