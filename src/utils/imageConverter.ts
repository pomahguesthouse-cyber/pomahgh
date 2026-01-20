/**
 * Convert image file to WebP format
 */
export const convertToWebP = async (file: File, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP conversion failed'));
          }
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if image URL is WebP format
 */
export const isWebPFormat = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.webp') || lowerUrl.includes('format=webp');
};

/**
 * Get image format from URL
 */
export const getImageFormat = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.webp') || lowerUrl.includes('format=webp')) return 'WebP';
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'JPEG';
  if (lowerUrl.includes('.png')) return 'PNG';
  if (lowerUrl.includes('.gif')) return 'GIF';
  if (lowerUrl.includes('.svg')) return 'SVG';
  return 'Unknown';
};

/**
 * Compress image if it exceeds max size
 */
export const compressImage = async (
  file: File,
  maxSizeKB = 500,
  quality = 0.8
): Promise<Blob> => {
  const fileSizeKB = file.size / 1024;
  
  if (fileSizeKB <= maxSizeKB) {
    return file;
  }

  // Calculate target quality based on current size
  const targetQuality = Math.min(quality, (maxSizeKB / fileSizeKB) * quality);
  
  return convertToWebP(file, Math.max(0.3, targetQuality));
};

/**
 * Convert image from URL to WebP Blob
 */
export const convertUrlToWebP = async (
  imageUrl: string,
  quality = 0.85
): Promise<{ blob: Blob; originalSize: number; newSize: number }> => {
  // Fetch image as blob
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const originalBlob = await response.blob();
  const originalSize = originalBlob.size;

  // Convert blob to file then to WebP
  const file = new File([originalBlob], 'image.jpg', { type: originalBlob.type });
  const webpBlob = await convertToWebP(file, quality);

  return {
    blob: webpBlob,
    originalSize,
    newSize: webpBlob.size,
  };
};












