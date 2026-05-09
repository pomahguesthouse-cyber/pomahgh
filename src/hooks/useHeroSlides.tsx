import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HeroSlide {
  id: string;
  image_url: string | null;
  video_url?: string | null;
  media_type: 'image' | 'video';
  overlay_text: string;
  overlay_subtext: string | null;
  font_family: string;
  font_size: string;
  font_weight: string;
  text_color: string;
  text_align: string;
  subtitle_font_family?: string | null;
  subtitle_font_size?: string | null;
  subtitle_font_weight?: string | null;
  subtitle_text_color?: string | null;
  title_animation?: string | null;
  subtitle_animation?: string | null;
  title_animation_loop?: boolean | null;
  subtitle_animation_loop?: boolean | null;
  show_overlay?: boolean | null;
  overlay_gradient_from?: string | null;
  overlay_gradient_to?: string | null;
  overlay_opacity?: number | null;
  display_order: number;
  is_active: boolean;
  duration: number;
  transition_effect: string;
  created_at: string;
  updated_at: string;
}

// Explicit column list — keep in sync with the HeroSlide interface above.
// Avoids `select("*")` so we don't pay for columns the public site never
// reads (e.g. internal admin metadata).
const HERO_SLIDE_COLUMNS =
  "id,image_url,video_url,media_type,overlay_text,overlay_subtext," +
  "font_family,font_size,font_weight,text_color,text_align," +
  "subtitle_font_family,subtitle_font_size,subtitle_font_weight,subtitle_text_color," +
  "title_animation,subtitle_animation,title_animation_loop,subtitle_animation_loop," +
  "show_overlay,overlay_gradient_from,overlay_gradient_to,overlay_opacity," +
  "display_order,is_active,duration,transition_effect,created_at,updated_at";

export const useHeroSlides = () => {
  return useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select(HERO_SLIDE_COLUMNS)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as unknown as HeroSlide[];
    },
  });
};

export const useAdminHeroSlides = () => {
  return useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select(HERO_SLIDE_COLUMNS)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as unknown as HeroSlide[];
    },
  });
};

export const useCreateHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slide: Omit<HeroSlide, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("hero_slides")
        .insert([slide])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      toast.success("Hero slide berhasil ditambahkan");
    },
    onError: (error) => {
      toast.error("Gagal menambahkan hero slide: " + error.message);
    },
  });
};

export const useUpdateHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...slide }: Partial<HeroSlide> & { id: string }) => {
      const { data, error } = await supabase
        .from("hero_slides")
        .update(slide)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      toast.success("Hero slide berhasil diupdate");
    },
    onError: (error) => {
      toast.error("Gagal mengupdate hero slide: " + error.message);
    },
  });
};

export const useDeleteHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hero_slides")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      toast.success("Hero slide berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus hero slide: " + error.message);
    },
  });
};

export const uploadHeroImage = async (file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError, data } = await supabase.storage
    .from("hero-images")
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("hero-images")
    .getPublicUrl(filePath);

  return publicUrl;
};

export const uploadHeroVideo = async (file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("hero-videos")
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("hero-videos")
    .getPublicUrl(filePath);

  return publicUrl;
};
