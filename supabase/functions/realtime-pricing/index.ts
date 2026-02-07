// Real-time pricing edge function
// High-performance pricing calculation engine

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingRequest {
  room_id?: string;
  room_ids?: string[];
  date?: string;
  force_recalculate?: boolean;
  batch_size?: number;
}

interface PricingResponse {
  success: boolean;
  data?: any;
  error?: string;
  processing_time_ms?: number;
  events_processed?: number;
}

interface RoomPricingData {
  room_id: string;
  base_price: number;
  calculated_price: number;
  occupancy_rate: number;
  demand_multiplier: number;
  time_multiplier: number;
  competitor_multiplier: number;
  final_multiplier: number;
  pricing_factors: any;
}

class RealTimePricingEngine {
  private supabase: any;
  private redis: any; // Redis client for caching

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Main real-time pricing calculation
  async calculateRealTimePrice(roomId: string, date: string, forceRecalculate = false): Promise<RoomPricingData> {
    const startTime = Date.now();

    try {
      // Check cache first (unless force recalculate)
      if (!forceRecalculate) {
        const cached = await this.getPriceFromCache(roomId, date);
        if (cached) {
          console.log(`Cache hit for room ${roomId} on ${date}`);
          return cached;
        }
      }

      // Calculate fresh pricing
      const pricingData = await this.performPricingCalculation(roomId, date);
      
      // Update cache
      await this.updatePriceCache(roomId, date, pricingData);
      
      // Record metrics
      await this.recordPricingMetrics(roomId, pricingData);
      
      console.log(`Real-time pricing calculated for room ${roomId} in ${Date.now() - startTime}ms`);
      return pricingData;

    } catch (error) {
      console.error(`Error calculating real-time price for room ${roomId}:`, error);
      throw error;
    }
  }

  // Perform the actual pricing calculation
  private async performPricingCalculation(roomId: string, date: string): Promise<RoomPricingData> {
    // Get room data
    const { data: room, error: roomError } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    // Calculate occupancy
    const occupancyData = await this.calculateOccupancy(roomId, date);
    
    // Get competitor data
    const competitorData = await this.getCompetitorData(roomId, date);
    
    // Calculate multipliers
    const timeMultiplier = this.calculateTimeMultiplier(date);
    const occupancyMultiplier = this.calculateOccupancyMultiplier(occupancyData.occupancy_rate);
    const competitorMultiplier = this.calculateCompetitorMultiplier(room.base_price, competitorData.avg_price);
    const demandMultiplier = this.calculateDemandMultiplier(occupancyData.demand_score);
    
    // Apply all multipliers
    let finalMultiplier = timeMultiplier * occupancyMultiplier * competitorMultiplier * demandMultiplier;
    
    // Calculate final price
    let calculatedPrice = room.base_price * finalMultiplier;
    
    // Apply min/max constraints
    if (room.min_auto_price && calculatedPrice < room.min_auto_price) {
      calculatedPrice = room.min_auto_price;
      finalMultiplier = calculatedPrice / room.base_price;
    }
    
    if (room.max_auto_price && calculatedPrice > room.max_auto_price) {
      calculatedPrice = room.max_auto_price;
      finalMultiplier = calculatedPrice / room.base_price;
    }
    
    // Round to nearest 10000 (Indonesian pricing convention)
    calculatedPrice = Math.round(calculatedPrice / 10000) * 10000;

    return {
      room_id: roomId,
      base_price: room.base_price,
      calculated_price: calculatedPrice,
      occupancy_rate: occupancyData.occupancy_rate,
      demand_multiplier: demandMultiplier,
      time_multiplier: timeMultiplier,
      competitor_multiplier: competitorMultiplier,
      final_multiplier: finalMultiplier,
      pricing_factors: {
        date,
        day_of_week: new Date(date).getDay(),
        is_weekend: [0, 6].includes(new Date(date).getDay()),
        occupancy_data: occupancyData,
        competitor_data: competitorData,
        room_constraints: {
          min_auto_price: room.min_auto_price,
          max_auto_price: room.max_auto_price
        }
      }
    };
  }

  // Calculate real-time occupancy
  private async calculateOccupancy(roomId: string, date: string): Promise<any> {
    const { data: room } = await this.supabase
      .from('rooms')
      .select('allotment')
      .eq('id', roomId)
      .single();

    // Count booked units
    const { data: bookings } = await this.supabase
      .from('booking_rooms')
      .select('room_number')
      .eq('room_id', roomId)
      .in('booking_id', 
        this.supabase
          .from('bookings')
          .select('id')
          .eq('room_id', roomId)
          .not('status', 'in', '("cancelled","rejected")')
          .lte('check_in', date)
          .gt('check_out', date)
      );

    const totalAllotment = room?.allotment || 1;
    const bookedUnits = bookings?.length || 0;
    const availableUnits = Math.max(0, totalAllotment - bookedUnits);
    const occupancyRate = totalAllotment > 0 ? (bookedUnits / totalAllotment) * 100 : 0;

    // Calculate demand score
    const demandScore = this.calculateDemandScore(occupancyRate, room.base_price);

    return {
      total_allotment: totalAllotment,
      booked_units: bookedUnits,
      available_units: availableUnits,
      occupancy_rate: occupancyRate,
      demand_score: demandScore
    };
  }

  // Get competitor pricing data
  private async getCompetitorData(roomId: string, date: string): Promise<any> {
    const sevenDaysAgo = new Date(date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: surveys } = await this.supabase
      .from('competitor_price_surveys')
      .select('price')
      .in('competitor_room_id', 
        this.supabase
          .from('competitor_rooms')
          .select('id')
          .eq('comparable_room_id', roomId)
          .eq('is_active', true)
      )
      .gte('survey_date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('survey_date', date);

    if (!surveys || surveys.length === 0) {
      return { avg_price: 0, min_price: 0, max_price: 0, sample_count: 0 };
    }

    const prices = surveys.map(s => Number(s.price));
    return {
      avg_price: prices.reduce((a, b) => a + b, 0) / prices.length,
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      sample_count: prices.length
    };
  }

  // Calculate time-based multiplier
  private calculateTimeMultiplier(date: string): number {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = [0, 6].includes(dayOfWeek);
    const isPeakSeason = [6, 7, 8, 12].includes(dateObj.getMonth()); // Summer, December

    if (isWeekend) return 1.2;
    if (isPeakSeason) return 1.3;
    return 1.0;
  }

  // Calculate occupancy-based multiplier (aggressive pricing)
  private calculateOccupancyMultiplier(occupancyRate: number): number {
    if (occupancyRate >= 95) return 1.5; // Very high demand
    if (occupancyRate >= 85) return 1.3; // High demand
    if (occupancyRate >= 70) return 1.15; // Medium demand
    if (occupancyRate <= 30) return 0.85; // Low demand
    return 1.0; // Normal demand
  }

  // Calculate competitor-based multiplier
  private calculateCompetitorMultiplier(ourPrice: number, competitorAvg: number): number {
    if (competitorAvg === 0) return 1.0;
    
    if (ourPrice < competitorAvg * 0.9) return 1.1; // We're cheaper, can increase
    if (ourPrice > competitorAvg * 1.1) return 0.95; // We're expensive, should decrease
    return 1.0; // Competitive
  }

  // Calculate demand score multiplier
  private calculateDemandScore(occupancyRate: number, ourPrice: number): number {
    // Simple demand score calculation
    return Math.min(100, occupancyRate + Math.random() * 10);
  }

  private calculateDemandMultiplier(demandScore: number): number {
    return 1.0 + (demandScore - 50) / 100;
  }

  // Cache operations
  private async getPriceFromCache(roomId: string, date: string): Promise<RoomPricingData | null> {
    const { data } = await this.supabase
      .from('price_cache')
      .select('*')
      .eq('room_id', roomId)
      .eq('date', date)
      .gt('valid_until', new Date().toISOString())
      .single();

    if (!data) return null;

    return {
      room_id: data.room_id,
      base_price: data.base_price,
      calculated_price: data.price_per_night,
      occupancy_rate: data.occupancy_rate,
      demand_multiplier: data.demand_multiplier,
      time_multiplier: data.time_multiplier,
      competitor_multiplier: data.competitor_multiplier,
      final_multiplier: data.final_multiplier,
      pricing_factors: data.pricing_factors
    };
  }

  private async updatePriceCache(roomId: string, date: string, pricingData: RoomPricingData): Promise<void> {
    await this.supabase
      .from('price_cache')
      .upsert({
        room_id: roomId,
        date: date,
        price_per_night: pricingData.calculated_price,
        base_price: pricingData.base_price,
        occupancy_rate: pricingData.occupancy_rate,
        demand_multiplier: pricingData.demand_multiplier,
        time_multiplier: pricingData.time_multiplier,
        competitor_multiplier: pricingData.competitor_multiplier,
        final_multiplier: pricingData.final_multiplier,
        pricing_factors: pricingData.pricing_factors,
        valid_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        updated_at: new Date().toISOString()
      });
  }

  // Record pricing metrics
  private async recordPricingMetrics(roomId: string, pricingData: RoomPricingData): Promise<void> {
    await this.supabase
      .from('pricing_metrics')
      .insert({
        room_id: roomId,
        metric_type: 'price_change',
        metric_value: pricingData.calculated_price,
        previous_value: pricingData.base_price,
        change_percentage: ((pricingData.calculated_price - pricingData.base_price) / pricingData.base_price) * 100,
        recorded_at: new Date().toISOString(),
        context_data: pricingData.pricing_factors
      });
  }

  // Process pricing events queue
  async processPricingEvents(batchSize = 10): Promise<{ events_processed: number; errors: number }> {
    const { data: events } = await this.supabase
      .from('pricing_events')
      .select('*')
      .eq('processed', false)
      .lt('retry_count', 3)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batchSize);

    let processed = 0;
    let errors = 0;

    for (const event of events || []) {
      try {
        await this.processPricingEvent(event);
        processed++;
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errors++;
        
        // Update event with error
        await this.supabase
          .from('pricing_events')
          .update({
            processed: false,
            error_message: error.message,
            retry_count: event.retry_count + 1,
            status: event.retry_count + 1 >= 3 ? 'failed' : 'pending'
          })
          .eq('id', event.id);
      }
    }

    return { events_processed: processed, errors };
  }

  // Process individual pricing event
  private async processPricingEvent(event: any): Promise<void> {
    // Mark as processing
    await this.supabase
      .from('pricing_events')
      .update({
        processing_started_at: new Date().toISOString(),
        status: 'processing'
      })
      .eq('id', event.id);

    // Handle event based on type
    switch (event.event_type) {
      case 'booking_change':
      case 'occupancy_update':
      case 'competitor_change':
        await this.calculateRealTimePrice(event.room_id, new Date().toISOString().split('T')[0], true);
        break;
      
      case 'time_trigger':
        await this.calculateRealTimePrice(event.room_id, new Date().toISOString().split('T')[0], true);
        break;
      
      case 'manual_override':
        // Handle manual price changes
        await this.handleManualOverride(event);
        break;
    }

    // Mark as completed
    await this.supabase
      .from('pricing_events')
      .update({
        processed: true,
        processing_completed_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', event.id);
  }

  // Handle manual price override
  private async handleManualOverride(event: any): Promise<void> {
    const eventData = event.event_data;
    const oldPrice = Number(eventData.old_base_price || eventData.old_price_per_night);
    const newPrice = Number(eventData.new_base_price || eventData.new_price_per_night);
    
    // Check if approval is needed
    const needsApproval = await this.checkPriceApprovalThreshold(event.room_id, oldPrice, newPrice);
    
    if (needsApproval) {
      // Create approval request
      await this.supabase
        .from('price_approvals')
        .insert({
          room_id: event.room_id,
          old_price: oldPrice,
          new_price: newPrice,
          price_change_percentage: Math.abs((newPrice - oldPrice) / oldPrice * 100),
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          pricing_calculation_id: event.id
        });
      
      // Send WhatsApp notification for approval
      await this.sendWhatsAppApprovalNotification(event.room_id, oldPrice, newPrice);
    } else {
      // Auto-approve
      await this.supabase
        .from('price_approvals')
        .insert({
          room_id: event.room_id,
          old_price: oldPrice,
          new_price: newPrice,
          price_change_percentage: Math.abs((newPrice - oldPrice) / oldPrice * 100),
          status: 'auto_approved',
          auto_approve: true
        });
    }
  }

  // Check if price change needs approval
  private async checkPriceApprovalThreshold(roomId: string, oldPrice: number, newPrice: number): Promise<boolean> {
    const changePercentage = Math.abs((newPrice - oldPrice) / oldPrice * 100);
    return changePercentage > 10; // 10% threshold
  }

  // Send WhatsApp approval notification
  private async sendWhatsAppApprovalNotification(roomId: string, oldPrice: number, newPrice: number): Promise<void> {
    try {
      const { data: room } = await this.supabase
        .from('rooms')
        .select('name')
        .eq('id', roomId)
        .single();

      const { data: settings } = await this.supabase
        .from('hotel_settings')
        .select('whatsapp_number, hotel_name')
        .single();

      if (settings?.whatsapp_number) {
        const message = `🔄 *PRICE CHANGE APPROVAL NEEDED*

Room: ${room?.name}
Old Price: Rp ${oldPrice.toLocaleString('id-ID')}
New Price: Rp ${newPrice.toLocaleString('id-ID')}
Change: ${Math.abs((newPrice - oldPrice) / oldPrice * 100).toFixed(1)}%

Reply "APPROVE ${roomId}" to approve or "REJECT ${roomId}" to reject.

Expires in 30 minutes.`;

        await this.supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: settings.whatsapp_number,
            message: message,
            type: 'admin'
          }
        });
      }
    } catch (error) {
      console.error('Error sending WhatsApp approval notification:', error);
    }
  }
}

// Main edge function handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const engine = new RealTimePricingEngine(supabaseUrl, supabaseKey);
    const body: PricingRequest = await req.json();

    let response: PricingResponse;

    switch (new URL(req.url).pathname) {
      case '/calculate':
        // Calculate real-time price for single room
        if (!body.room_id) {
          throw new Error('room_id is required');
        }
        
        const pricingData = await engine.calculateRealTimePrice(
          body.room_id,
          body.date || new Date().toISOString().split('T')[0],
          body.force_recalculate || false
        );

        response = {
          success: true,
          data: pricingData,
          processing_time_ms: Date.now() - startTime
        };
        break;

      case '/batch-calculate':
        // Calculate prices for multiple rooms
        const roomIds = body.room_ids || [];
        const results = [];

        for (const roomId of roomIds) {
          try {
            const data = await engine.calculateRealTimePrice(
              roomId,
              body.date || new Date().toISOString().split('T')[0],
              body.force_recalculate || false
            );
            results.push({ room_id: roomId, success: true, data });
          } catch (error) {
            results.push({ room_id: roomId, success: false, error: error.message });
          }
        }

        response = {
          success: true,
          data: results,
          processing_time_ms: Date.now() - startTime
        };
        break;

      case '/process-events':
        // Process pricing events queue
        const result = await engine.processPricingEvents(body.batch_size || 10);
        
        response = {
          success: true,
          data: result,
          processing_time_ms: Date.now() - startTime,
          events_processed: result.events_processed
        };
        break;

      default:
        throw new Error('Invalid endpoint');
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Real-time pricing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processing_time_ms: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});