import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Optimized database service with query batching and caching
export class DatabaseService {
  // Generic query with caching
  static async fetchWithCache<T>(
    table: string,
    select: string = "*",
    filters?: Record<string, any>,
    orderBy?: { column: string; ascending?: boolean }
  ): Promise<T[]> {
    let query = supabase.from(table).select(select);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  // Batch queries for better performance
  static async fetchMultiple<T>(
    queries: Array<{
      table: string;
      select: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
    }>
  ): Promise<T[][]> {
    return Promise.all(queries.map(q => this.fetchWithCache<T>(q.table, q.select, q.filters, q.orderBy)));
  }

  // Optimized room fetching with joins
  static async fetchRooms() {
    const today = new Date().toISOString().split("T")[0];
    
    // Single query with proper joins
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        id, name, slug, description, price_per_night, max_guests,
        features, image_url, image_urls, virtual_tour_url, available,
        size_sqm, room_count, room_numbers, allotment, base_price,
        final_price, promo_price, promo_start_date, promo_end_date,
        sunday_price, monday_price, tuesday_price, wednesday_price,
        thursday_price, friday_price, saturday_price,
        room_promotions!inner(
          id, name, promo_price, discount_percentage, 
          start_date, end_date, priority, badge_text, badge_color
        )
      `)
      .eq("available", true)
      .eq("room_promotions.is_active", true)
      .lte("room_promotions.start_date", today)
      .gte("room_promotions.end_date", today)
      .order("price_per_night", { ascending: true });

    if (error) throw error;
    return data;
  }

  // Optimized booking queries
  static async fetchBookings(filters?: {
    status?: string;
    date_from?: string;
    date_to?: string;
  }) {
    let query = supabase
      .from("bookings")
      .select(`
        id, created_at, check_in, check_out, total_price, status,
        guest_name, guest_email, guest_phone, room_count,
        rooms:booking_rooms(
          room_id, allocated_room_number, room_name
        )
      `);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    
    if (filters?.date_from) {
      query = query.gte("check_in", filters.date_from);
    }
    
    if (filters?.date_to) {
      query = query.lte("check_out", filters.date_to);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  // Optimized update with minimal columns
  static async updatePartial<T>(
    table: string,
    id: string,
    updates: Partial<T>
  ) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Custom hooks for optimized queries
export const useOptimizedQuery = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options = {}
) => {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

export const useOptimizedMutation = <T, V>(
  mutationFn: (variables: V) => Promise<T>,
  onSuccess?: (data: T, variables: V) => void,
  invalidateQueries?: string[][]
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      if (onSuccess) onSuccess(data, variables);
    },
  });
};

// Optimized hooks for specific entities
export const useOptimizedRooms = () => {
  return useOptimizedQuery(
    ["rooms", "optimized"],
    () => DatabaseService.fetchRooms(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes for rooms
    }
  );
};

export const useOptimizedBookings = (filters?: {
  status?: string;
  date_from?: string;
  date_to?: string;
}) => {
  return useOptimizedQuery(
    ["bookings", "optimized", filters],
    () => DatabaseService.fetchBookings(filters),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for bookings
    }
  );
};