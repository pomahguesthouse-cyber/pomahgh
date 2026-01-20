import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CompetitorPriceSurvey {
  id: string;
  competitor_room_id: string;
  survey_date: string;
  price: number;
  price_source: string;
  surveyed_by: string | null;
  notes: string | null;
  created_at: string;
  competitor_rooms?: {
    room_name: string;
    competitor_hotels?: {
      name: string;
    };
  };
}

export type CompetitorPriceSurveyInsert = {
  competitor_room_id: string;
  survey_date: string;
  price: number;
  price_source?: string;
  notes?: string;
};

export const useCompetitorPriceSurveys = (days: number = 30) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString().split('T')[0];

  const { data: surveys = [], isLoading, error } = useQuery({
    queryKey: ['competitor-price-surveys', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_price_surveys')
        .select(`
          *,
          competitor_rooms (
            room_name,
            competitor_hotels (name)
          )
        `)
        .gte('survey_date', fromDateStr)
        .order('survey_date', { ascending: false });
      
      if (error) throw error;
      return data as CompetitorPriceSurvey[];
    }
  });

  const createSurvey = useMutation({
    mutationFn: async (survey: CompetitorPriceSurveyInsert) => {
      const { data, error } = await supabase
        .from('competitor_price_surveys')
        .insert(survey)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-price-surveys'] });
      toast({ title: "Survey harga berhasil disimpan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menyimpan survey", description: error.message, variant: "destructive" });
    }
  });

  const deleteSurvey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitor_price_surveys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-price-surveys'] });
      toast({ title: "Survey harga berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menghapus survey", description: error.message, variant: "destructive" });
    }
  });

  return {
    surveys,
    isLoading,
    error,
    createSurvey,
    deleteSurvey
  };
};