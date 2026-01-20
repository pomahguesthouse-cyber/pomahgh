import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SeoSettings {
  id: string;
  created_at?: string;
  updated_at?: string;
  site_title: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url: string;
  default_og_image?: string;
  og_site_name: string;
  og_locale?: string;
  twitter_handle?: string;
  facebook_app_id?: string;
  business_type: string;
  geo_region?: string;
  geo_placename?: string;
  geo_coordinates?: string;
  price_range?: string;
  allow_indexing: boolean;
  follow_links: boolean;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  google_search_console_verification?: string;
  bing_verification?: string;
  facebook_pixel_id?: string;
  custom_head_scripts?: string;
  robots_txt_custom?: string;
  structured_data_enabled: boolean;
  sitemap_auto_generate: boolean;
  sitemap_change_freq?: string;
  sitemap_priority_home?: number;
  sitemap_priority_rooms?: number;
  custom_json_ld?: string;
}

export const useSeoSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as SeoSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SeoSettings>) => {
      if (!settings?.id) throw new Error("No settings found");

      const { data, error } = await supabase
        .from("seo_settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
      toast({
        title: "SEO Settings Updated",
        description: "SEO settings have been updated successfully.",
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

  const uploadOgImage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `og-image-${Date.now()}.${fileExt}`;
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

  const generateSitemap = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-sitemap');
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sitemap Generated",
        description: "Sitemap has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate sitemap: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    uploadOgImage,
    generateSitemap: generateSitemap.mutate,
    isGeneratingSitemap: generateSitemap.isPending,
  };
};
