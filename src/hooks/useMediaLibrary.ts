import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MediaFile {
  id: string;
  file_name: string;
  original_name: string;
  file_url: string;
  file_type: "image" | "video";
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  tags?: string[];
  folder: string;
  created_at: string;
  updated_at: string;
}

export interface MediaUploadInput {
  file: File;
  alt_text?: string;
  tags?: string[];
  folder?: string;
}

export function useMediaLibrary(folder?: string) {
  const queryClient = useQueryClient();

  const { data: mediaFiles, isLoading, error } = useQuery({
    queryKey: ["media-library", folder],
    queryFn: async () => {
      let query = supabase
        .from("media_library")
        .select("*")
        .order("created_at", { ascending: false });

      if (folder && folder !== "all") {
        query = query.eq("folder", folder);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MediaFile[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, alt_text, tags, folder = "uncategorized" }: MediaUploadInput) => {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("media-library")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("media-library")
        .getPublicUrl(filePath);

      // Determine file type
      const fileType = file.type.startsWith("video/") ? "video" : "image";

      // Get image dimensions if it's an image
      let width: number | undefined;
      let height: number | undefined;

      if (fileType === "image") {
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      }

      // Insert metadata
      const { data, error: insertError } = await supabase
        .from("media_library")
        .insert({
          file_name: fileName,
          original_name: file.name,
          file_url: urlData.publicUrl,
          file_type: fileType,
          mime_type: file.type,
          file_size: file.size,
          width,
          height,
          alt_text,
          tags,
          folder,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast.success("File berhasil diupload");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Gagal mengupload file");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, alt_text, tags, folder }: { id: string; alt_text?: string; tags?: string[]; folder?: string }) => {
      const { data, error } = await supabase
        .from("media_library")
        .update({ alt_text, tags, folder })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast.success("Media berhasil diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui media");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (media: MediaFile) => {
      // Delete from storage
      const filePath = `${media.folder}/${media.file_name}`;
      const { error: storageError } = await supabase.storage
        .from("media-library")
        .remove([filePath]);

      if (storageError) console.error("Storage delete error:", storageError);

      // Delete metadata
      const { error } = await supabase
        .from("media_library")
        .delete()
        .eq("id", media.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast.success("File berhasil dihapus");
    },
    onError: () => {
      toast.error("Gagal menghapus file");
    },
  });

  return {
    mediaFiles: mediaFiles || [],
    isLoading,
    error,
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });
}

export function useFolders() {
  return useQuery({
    queryKey: ["media-folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_library")
        .select("folder")
        .order("folder");

      if (error) throw error;

      const folders = [...new Set(data.map((d) => d.folder))].filter(Boolean);
      return folders as string[];
    },
  });
}
