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
  model_position_x: number;
  model_position_y: number;
  model_position_z: number;
  model_rotation_x: number;
  model_rotation_y: number;
  model_rotation_z: number;
  model_scale: number;
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

type ProgressCallback = (progress: number) => void;

export const upload3DModel = async (
  file: File,
  onProgress?: ProgressCallback
): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  // Get current user's session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Anda harus login sebagai admin untuk upload");
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Get public URL after successful upload
        const { data } = supabase.storage
          .from("3d-models")
          .getPublicUrl(filePath);
        resolve(data.publicUrl);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));

    // Get Supabase config
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Construct Supabase storage upload URL
    const uploadUrl = `${supabaseUrl}/storage/v1/object/3d-models/${filePath}`;
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(file);
  });
};
