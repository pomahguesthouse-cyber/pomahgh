import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const use360Upload = () => {
  const upload360Image = async (file: File): Promise<string> => {
    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File terlalu besar. Maksimal 20MB untuk gambar 360°");
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Format file tidak didukung. Gunakan JPG, PNG, atau WEBP");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("360-images")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Gagal upload: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("360-images").getPublicUrl(fileName);

    return publicUrl;
  };

  return { upload360Image };
};












