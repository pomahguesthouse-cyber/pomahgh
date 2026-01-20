import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useFloorPlanUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, file }: { roomId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${roomId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("360-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("360-images")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("rooms")
        .update({ 
          floor_plan_url: publicUrl,
          floor_plan_enabled: true 
        })
        .eq("id", roomId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Floor plan uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to upload floor plan", {
        description: error.message,
      });
    },
  });
};

export const useUpdatePanoramaPosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      panoramaId,
      x,
      y,
      icon,
    }: {
      panoramaId: string;
      x: number;
      y: number;
      icon?: string;
    }) => {
      const { error } = await supabase
        .from("room_panoramas")
        .update({
          floor_plan_x: x,
          floor_plan_y: y,
          ...(icon && { floor_plan_icon: icon }),
        })
        .eq("id", panoramaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-panoramas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-panoramas"] });
      toast.success("Panorama position updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update position", {
        description: error.message,
      });
    },
  });
};

export const useToggleFloorPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, enabled }: { roomId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("rooms")
        .update({ floor_plan_enabled: enabled })
        .eq("id", roomId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Floor plan visibility updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update floor plan", {
        description: error.message,
      });
    },
  });
};
