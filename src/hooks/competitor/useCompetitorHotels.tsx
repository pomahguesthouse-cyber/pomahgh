import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/shared/useToast";

export interface CompetitorHotel {
  id: string;
  name: string;
  address: string | null;
  distance_km: number | null;
  website_url: string | null;
  google_maps_url: string | null;
  notes: string | null;
  is_active: boolean;
  scrape_url: string | null;
  scrape_enabled: boolean;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CompetitorHotelInsert = Omit<CompetitorHotel, 'id' | 'created_at' | 'updated_at' | 'last_scraped_at'>;
export type CompetitorHotelUpdate = Partial<Omit<CompetitorHotelInsert, 'last_scraped_at'>>;

export const useCompetitorHotels = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hotels = [], isLoading, error } = useQuery({
    queryKey: ['competitor-hotels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_hotels')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as CompetitorHotel[];
    }
  });

  const createHotel = useMutation({
    mutationFn: async (hotel: CompetitorHotelInsert) => {
      const { data, error } = await supabase
        .from('competitor_hotels')
        .insert(hotel)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-hotels'] });
      toast({ title: "Hotel kompetitor berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menambahkan hotel", description: error.message, variant: "destructive" });
    }
  });

  const updateHotel = useMutation({
    mutationFn: async ({ id, ...updates }: CompetitorHotelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('competitor_hotels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-hotels'] });
      toast({ title: "Hotel kompetitor berhasil diupdate" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal mengupdate hotel", description: error.message, variant: "destructive" });
    }
  });

  const deleteHotel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitor_hotels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-hotels'] });
      toast({ title: "Hotel kompetitor berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menghapus hotel", description: error.message, variant: "destructive" });
    }
  });

  return {
    hotels,
    isLoading,
    error,
    createHotel,
    updateHotel,
    deleteHotel
  };
};












