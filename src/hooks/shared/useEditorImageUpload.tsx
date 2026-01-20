import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEditorImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File terlalu besar. Maksimal 5MB');
      return null;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipe file tidak valid. Gunakan JPG, PNG, WEBP, SVG, atau GIF');
      return null;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('editor-images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('editor-images')
        .getPublicUrl(fileName);

      toast.success('Gambar berhasil diupload');
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Gagal mengupload gambar');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadFromBlob = async (blob: Blob, filename: string): Promise<string | null> => {
    const file = new File([blob], filename, { type: blob.type });
    return uploadImage(file);
  };

  return { uploadImage, uploadFromBlob, uploading };
}












