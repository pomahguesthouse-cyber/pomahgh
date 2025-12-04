import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WhatsAppContact {
  number: string;
  label: string;
}

export interface HotelSettings {
  id: string;
  created_at?: string;
  updated_at?: string;
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
  auto_send_invoice?: boolean;
  payment_instructions?: string;
  bank_name?: string;
  account_number?: string;
  account_holder_name?: string;
  refund_policy_enabled?: boolean;
  refund_policy_type?: string;
  full_refund_days_before?: number;
  partial_refund_days_before?: number;
  partial_refund_percentage?: number;
  no_refund_days_before?: number;
  refund_policy_text?: string;
  hotel_policies_text?: string;
  hotel_policies_enabled?: boolean;
  // WhatsApp settings
  whatsapp_session_timeout_minutes?: number;
  whatsapp_ai_whitelist?: string[];
  whatsapp_contact_numbers?: WhatsAppContact[];
  whatsapp_response_mode?: 'ai' | 'manual';
}

export const useHotelSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["hotel-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_settings")
        .select("*")
        .single();

      if (error) throw error;
      
      // Cast JSONB fields properly
      return {
        ...data,
        whatsapp_contact_numbers: (data.whatsapp_contact_numbers as unknown as WhatsAppContact[]) || [],
      } as HotelSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<HotelSettings>) => {
      if (!settings?.id) throw new Error("No settings found");

      // Convert WhatsAppContact[] back to Json for database
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.whatsapp_contact_numbers) {
        dbUpdates.whatsapp_contact_numbers = updates.whatsapp_contact_numbers as unknown;
      }

      const { data, error } = await supabase
        .from("hotel_settings")
        .update(dbUpdates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-settings"] });
      toast({
        title: "Settings Updated",
        description: "Hotel settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const uploadFile = async (file: File, type: "logo" | "favicon") => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("hotel-assets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("hotel-assets").getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    uploadFile,
  };
};
