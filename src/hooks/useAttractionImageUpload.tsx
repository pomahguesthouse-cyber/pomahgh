import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useAttractionImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const uploadImage = async (file: File): Promise<string> => {
    // Validasi size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File terlalu besar. Maksimal 5MB");
    }

    // Validasi type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Format file tidak didukung. Gunakan JPG, PNG, atau WEBP");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("attraction-images")
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("attraction-images")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const uploadMainImage = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      toast({ title: "Sukses", description: "Gambar berhasil diupload" });
      return url;
    } catch (error: unknown) {
      toast({ title: "Upload gagal", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const uploadGalleryImages = async (files: FileList): Promise<string[]> => {
    setUploadingGallery(true);
    const urls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        urls.push(url);
      }
      toast({ title: "Sukses", description: `${urls.length} gambar berhasil diupload` });
      return urls;
    } catch (error: unknown) {
      toast({ title: "Upload gagal", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      throw error;
    } finally {
      setUploadingGallery(false);
    }
  };

  return { uploading, uploadingGallery, uploadMainImage, uploadGalleryImages };
};
