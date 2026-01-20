import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricingAdjustmentLog {
  id: string;
  room_id: string;
  previous_price: number;
  new_price: number;
  competitor_avg_price: number;
  adjustment_reason: string;
  adjustment_type: string;
  executed_at: string;
  rooms?: {
    name: string;
  };
}

export const usePricingAdjustmentLogs = (days: number = 30) => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromDateStr = fromDate.toISOString();

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pricing-adjustment-logs', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_adjustment_logs')
        .select(`
          *,
          rooms (name)
        `)
        .gte('executed_at', fromDateStr)
        .order('executed_at', { ascending: false });
      
      if (error) throw error;
      return data as PricingAdjustmentLog[];
    }
  });

  return {
    logs,
    isLoading,
    error,
    refetch
  };
};












