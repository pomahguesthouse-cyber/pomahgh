import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExploreHeroSlide {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  display_order: number;
  is_active: boolean;
  duration: number;
  show_overlay: boolean;
  overlay_opacity: number;
  overlay_gradient_from: string;
  overlay_gradient_to: string;
  created_at: string;
  updated_at: string;
}

export const useExploreHeroSlides = () => {
  return useQuery({
    queryKey: ["explore-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("explore_hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ExploreHeroSlide[];
    },
  });
};

export const useAdminExploreHeroSlides = () => {
  return useQuery({
    queryKey: ["admin-explore-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("explore_hero_slides")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ExploreHeroSlide[];
    },
  });
};

export const useCreateExploreHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slide: Omit<ExploreHeroSlide, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("explore_hero_slides")
        .insert([slide])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-explore-hero-slides"] });
      toast.success("Slide berhasil ditambahkan");
    },
    onError: (error) => {
      toast.error("Gagal menambahkan slide: " + error.message);
    },
  });
};

export const useUpdateExploreHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...slide }: Partial<ExploreHeroSlide> & { id: string }) => {
      const { data, error } = await supabase
        .from("explore_hero_slides")
        .update(slide)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-explore-hero-slides"] });
      toast.success("Slide berhasil diupdate");
    },
    onError: (error) => {
      toast.error("Gagal mengupdate slide: " + error.message);
    },
  });
};

export const useDeleteExploreHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("explore_hero_slides")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-explore-hero-slides"] });
      toast.success("Slide berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus slide: " + error.message);
    },
  });
};

export const uploadExploreHeroImage = async (file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("explore-hero-images")
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("explore-hero-images")
    .getPublicUrl(filePath);

  return publicUrl;
};












