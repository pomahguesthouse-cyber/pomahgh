import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapedRoom {
  room_name: string;
  price: number;
  original_price?: number;
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    json?: ScrapedRoom[] | { rooms?: ScrapedRoom[] } | Record<string, unknown>;
    markdown?: string;
  };
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlApiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional hotelId filter
    let hotelId: string | null = null;
    try {
      const body = await req.json();
      hotelId = body?.hotelId || null;
    } catch {
      // No body or invalid JSON, scrape all enabled hotels
    }

    // Fetch hotels with scraping enabled
    let query = supabase
      .from("competitor_hotels")
      .select("id, name, scrape_url")
      .eq("is_active", true)
      .eq("scrape_enabled", true)
      .not("scrape_url", "is", null);

    if (hotelId) {
      query = query.eq("id", hotelId);
    }

    const { data: hotels, error: hotelsError } = await query;

    if (hotelsError) {
      console.error("Error fetching hotels:", hotelsError);
      throw hotelsError;
    }

    if (!hotels || hotels.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No hotels with scraping enabled",
          hotels_scraped: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${hotels.length} hotels to scrape`);

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (const hotel of hotels) {
      const hotelStartTime = Date.now();
      let status = "success";
      let roomsScraped = 0;
      let pricesAdded = 0;
      let errorMessage: string | null = null;

      try {
        console.log(`Scraping hotel: ${hotel.name} (${hotel.scrape_url})`);

        // Call Firecrawl API with simpler extraction approach
        const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: hotel.scrape_url,
            formats: ["markdown", "json"],
            jsonOptions: {
              prompt: "Extract all hotel room types with their names and prices. Return as JSON array with objects containing 'room_name' (string) and 'price' (number in IDR, remove 'Rp' and dots). Example: [{\"room_name\": \"Deluxe Room\", \"price\": 500000}]"
            },
            onlyMainContent: true,
            waitFor: 5000,
            timeout: 30000
          }),
        });

        const responseText = await firecrawlResponse.text();
        console.log(`Firecrawl response status: ${firecrawlResponse.status}`);
        
        let firecrawlData: FirecrawlResponse;
        try {
          firecrawlData = JSON.parse(responseText);
        } catch {
          console.error("Failed to parse Firecrawl response:", responseText.substring(0, 500));
          throw new Error(`Invalid JSON response from Firecrawl`);
        }

        if (!firecrawlResponse.ok || !firecrawlData.success) {
          console.error("Firecrawl API error:", firecrawlData);
          throw new Error(firecrawlData.error || `Firecrawl request failed with status ${firecrawlResponse.status}`);
        }

        // Try to extract rooms from JSON or parse from markdown
        let scrapedRooms: ScrapedRoom[] = [];
        
        const jsonData = firecrawlData.data?.json;
        if (jsonData) {
          // If json is an array of rooms directly
          if (Array.isArray(jsonData)) {
            scrapedRooms = jsonData as ScrapedRoom[];
          } else if (typeof jsonData === 'object' && 'rooms' in jsonData && Array.isArray(jsonData.rooms)) {
            scrapedRooms = jsonData.rooms as ScrapedRoom[];
          }
        }
        
        console.log(`Extracted ${scrapedRooms.length} rooms from JSON`);
        
        roomsScraped = scrapedRooms.length;

        if (roomsScraped === 0) {
          status = "partial";
          errorMessage = "No rooms found in scraped content";
          console.log(`No rooms found for hotel: ${hotel.name}`);
        } else {
          console.log(`Found ${roomsScraped} rooms for hotel: ${hotel.name}`);

          // Get competitor rooms for this hotel
          const { data: competitorRooms } = await supabase
            .from("competitor_rooms")
            .select("id, room_name")
            .eq("competitor_hotel_id", hotel.id)
            .eq("is_active", true);

          if (competitorRooms && competitorRooms.length > 0) {
            // Match scraped rooms with competitor rooms and insert prices
            for (const scrapedRoom of scrapedRooms) {
              // Try to find matching competitor room (fuzzy match)
              const matchedRoom = competitorRooms.find((cr) => {
                const scrapeNameLower = scrapedRoom.room_name.toLowerCase();
                const roomNameLower = cr.room_name.toLowerCase();
                return (
                  scrapeNameLower.includes(roomNameLower) ||
                  roomNameLower.includes(scrapeNameLower) ||
                  scrapeNameLower === roomNameLower
                );
              });

              if (matchedRoom && scrapedRoom.price > 0) {
                // Insert price survey
                const { error: insertError } = await supabase
                  .from("competitor_price_surveys")
                  .insert({
                    competitor_room_id: matchedRoom.id,
                    survey_date: today,
                    price: scrapedRoom.price,
                    price_source: "auto-scrape",
                    notes: `Auto-scraped from ${hotel.scrape_url}`
                  });

                if (!insertError) {
                  pricesAdded++;
                } else {
                  console.error(`Error inserting price for ${matchedRoom.room_name}:`, insertError);
                }
              }
            }
          }

          if (pricesAdded === 0 && roomsScraped > 0) {
            status = "partial";
            errorMessage = "Found rooms but could not match any to competitor rooms";
          }
        }

        // Update last_scraped_at
        await supabase
          .from("competitor_hotels")
          .update({ last_scraped_at: new Date().toISOString() })
          .eq("id", hotel.id);

      } catch (error) {
        status = "failed";
        errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error scraping hotel ${hotel.name}:`, error);
      }

      // Log scraping result
      const durationMs = Date.now() - hotelStartTime;
      await supabase.from("scrape_logs").insert({
        competitor_hotel_id: hotel.id,
        status,
        rooms_scraped: roomsScraped,
        prices_added: pricesAdded,
        error_message: errorMessage,
        duration_ms: durationMs
      });

      results.push({
        hotel_id: hotel.id,
        hotel_name: hotel.name,
        status,
        rooms_scraped: roomsScraped,
        prices_added: pricesAdded,
        error_message: errorMessage,
        duration_ms: durationMs
      });
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter((r) => r.status === "success").length;

    console.log(`Scraping completed: ${successCount}/${results.length} hotels successful in ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        hotels_scraped: results.length,
        successful: successCount,
        results,
        total_duration_ms: totalDuration
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scrape-competitor-prices:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to scrape";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
