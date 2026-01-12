import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ScrapeLog {
  id: string;
  competitor_hotel_id: string;
  status: 'success' | 'failed' | 'partial';
  rooms_scraped: number;
  prices_added: number;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  competitor_hotels?: {
    name: string;
  };
}

export interface ScrapeResult {
  success: boolean;
  hotels_scraped: number;
  successful: number;
  results: Array<{
    hotel_id: string;
    hotel_name: string;
    status: string;
    rooms_scraped: number;
    prices_added: number;
    error_message: string | null;
    duration_ms: number;
  }>;
  total_duration_ms: number;
  error?: string;
}

export const usePriceScraping = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recent scrape logs
  const { data: scrapeLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['scrape-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scrape_logs')
        .select(`
          *,
          competitor_hotels (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ScrapeLog[];
    }
  });

  // Trigger scraping for all enabled hotels or a specific hotel
  const triggerScrape = useMutation({
    mutationFn: async (hotelId?: string): Promise<ScrapeResult> => {
      const { data, error } = await supabase.functions.invoke('scrape-competitor-prices', {
        body: hotelId ? { hotelId } : {}
      });

      if (error) throw error;
      return data as ScrapeResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scrape-logs'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-price-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-hotels'] });
      
      if (data.success) {
        toast({
          title: "Scraping selesai",
          description: `${data.successful}/${data.hotels_scraped} hotel berhasil di-scrape`
        });
      } else {
        toast({
          title: "Scraping gagal",
          description: data.error || "Terjadi kesalahan saat scraping",
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal melakukan scraping",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    scrapeLogs,
    isLoadingLogs,
    triggerScrape
  };
};
