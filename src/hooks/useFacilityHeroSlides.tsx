import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FacilityHeroSlide {
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

export const useFacilityHeroSlides = () => {
  return useQuery({
    queryKey: ["facility-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as FacilityHeroSlide[];
    },
  });
};

export const useAdminFacilityHeroSlides = () => {
  return useQuery({
    queryKey: ["admin-facility-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_hero_slides")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as FacilityHeroSlide[];
    },
  });
};

export const useCreateFacilityHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slide: Omit<FacilityHeroSlide, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("facility_hero_slides")
        .insert([slide])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-facility-hero-slides"] });
      toast.success("Facility hero slide berhasil ditambahkan");
    },
    onError: (error) => {
      toast.error("Gagal menambahkan facility hero slide: " + error.message);
    },
  });
};

export const useUpdateFacilityHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...slide }: Partial<FacilityHeroSlide> & { id: string }) => {
      const { data, error } = await supabase
        .from("facility_hero_slides")
        .update(slide)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-facility-hero-slides"] });
      toast.success("Facility hero slide berhasil diupdate");
    },
    onError: (error) => {
      toast.error("Gagal mengupdate facility hero slide: " + error.message);
    },
  });
};

export const useDeleteFacilityHeroSlide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("facility_hero_slides")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-facility-hero-slides"] });
      toast.success("Facility hero slide berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus facility hero slide: " + error.message);
    },
  });
};

export const uploadFacilityHeroImage = async (file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("facility-hero-images")
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("facility-hero-images")
    .getPublicUrl(filePath);

  return publicUrl;
};
