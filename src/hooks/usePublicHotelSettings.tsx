import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicHotelSettings {
  id: string;
  hotel_name: string;
  tagline?: string;
  description?: string;
  about_us?: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email_primary?: string;
  email_reservations?: string;
  whatsapp_number?: string;
  logo_url?: string;
  invoice_logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  check_in_time?: string;
  check_out_time?: string;
  reception_hours_start?: string;
  reception_hours_end?: string;
  currency_code?: string;
  currency_symbol?: string;
  tax_rate?: number;
  tax_name?: string;
  latitude?: number;
  longitude?: number;
  min_stay_nights?: number;
  max_stay_nights?: number;
  refund_policy_enabled?: boolean;
  refund_policy_type?: string;
  full_refund_days_before?: number;
  partial_refund_days_before?: number;
  partial_refund_percentage?: number;
  no_refund_days_before?: number;
  refund_policy_text?: string;
  hotel_policies_text?: string;
  hotel_policies_enabled?: boolean;
  google_place_id?: string;
  header_bg_color?: string;
  header_bg_opacity?: number;
  header_blur?: number;
  header_show_logo?: boolean;
  header_text_color?: string;
  whatsapp_contact_numbers?: Array<{ number: string; label: string }>;
}

/**
 * Hook for public-facing components. Uses the security definer RPC function
 * that strips sensitive fields (bank details, manager numbers, pricing config).
 */
export const usePublicHotelSettings = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["hotel-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_hotel_settings");
      if (error) throw error;
      return (data as unknown as PublicHotelSettings) || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { settings, isLoading };
};
