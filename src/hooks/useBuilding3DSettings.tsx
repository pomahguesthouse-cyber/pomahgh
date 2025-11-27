import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Building3DSettings {
  id: string;
  model_url: string | null;
  model_type: string;
  title: string;
  subtitle: string;
  background_color: string;
  enable_auto_rotate: boolean;
  auto_rotate_speed: number;
  camera_position_x: number;
  camera_position_y: number;
  camera_position_z: number;
  enable_zoom: boolean;
  min_zoom: number;
  max_zoom: number;
  ambient_light_intensity: number;
  directional_light_intensity: number;
  show_section: boolean;
  is_active: boolean;
}

export const useBuilding3DSettings = () => {
  return useQuery({
    queryKey: ["building-3d-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_3d_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data as Building3DSettings;
    },
  });
};

export const useAdminBuilding3DSettings = () => {
  return useQuery({
    queryKey: ["admin-building-3d-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_3d_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as Building3DSettings;
    },
  });
};

export const useUpdateBuilding3DSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<Building3DSettings>) => {
      const { data: existing } = await supabase
        .from("building_3d_settings")
        .select("id")
        .single();

      if (existing?.id) {
        const { data, error } = await supabase
          .from("building_3d_settings")
          .update(settings)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("building_3d_settings")
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-3d-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-building-3d-settings"] });
      toast.success("3D settings berhasil diperbarui");
    },
    onError: (error) => {
      toast.error("Gagal memperbarui 3D settings");
      console.error("Error updating 3D settings:", error);
    },
  });
};

export const upload3DModel = async (file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("3d-models")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("3d-models")
    .getPublicUrl(filePath);

  return data.publicUrl;
};
