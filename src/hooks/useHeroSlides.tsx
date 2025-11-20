import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HeroSlide {
  id: string;
  image_url: string;
  overlay_text: string;
  overlay_subtext: string | null;
  font_family: string;
  font_size: string;
  font_weight: string;
  text_color: string;
  text_align: string;
  display_order: number;
  is_active: boolean;
  duration: number;
  transition_effect: string;
  created_at: string;
  updated_at: string;
}

export const useHeroSlides = () => {
  return useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as HeroSlide[];
    },
  });
};

export const useAdminHeroSlides = () => {
  return useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as HeroSlide[];
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
