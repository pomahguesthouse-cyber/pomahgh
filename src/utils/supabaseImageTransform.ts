/**
 * Supabase Image Transform Utilities
 * Optimizes image delivery by converting to WebP and applying responsive sizing
 * 
 * Benefits:
 * - 30-70% image size reduction via webp conversion
 * - Responsive sizing based on screen size
 * - Lazy loading support with blur placeholders
 */

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  format?: "webp" | "jpg" | "png";
  quality?: number;
}

/**
 * Add transform parameters to Supabase Storage image URLs
 * Converts images to WebP for better compression while maintaining quality
 */
export const getSupabaseImageUrl = (
  imagePath: string | null | undefined,
  options: ImageTransformOptions = {}
): string => {
  if (!imagePath) return "/placeholder.png";

  // If it's already a full URL, extract just the path
  let path = imagePath;
  if (imagePath.includes("storage/v1/object/public/")) {
    const parts = imagePath.split("storage/v1/object/public/");
    path = parts[1] || imagePath;
  }

  const {
    width,
    height,
    format = "webp",
    quality = 75,
  } = options;

  // Build transform parameters
  const params = new URLSearchParams();
  
  if (width) params.append("width", width.toString());
  if (height) params.append("height", height.toString());
  params.append("format", format);
  params.append("quality", quality.toString());

  // Construct the transform URL
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/render/image/public/${path}`;
  const queryString = params.toString();
  
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Get responsive image URL for different screen sizes
 */
export const getResponsiveImageUrl = (
  imagePath: string | null | undefined,
  screenSize: "mobile" | "tablet" | "desktop" = "desktop"
): string => {
  const widths = {
    mobile: 480,
    tablet: 768,
    desktop: 1200,
  };

  return getSupabaseImageUrl(imagePath, {
    width: widths[screenSize],
    format: "webp",
    quality: 75,
  });
};

/**
 * Generate a low-quality placeholder for blur-up effect
 */
export const getBlurPlaceholder = (imagePath: string | null | undefined): string => {
  return getSupabaseImageUrl(imagePath, {
    width: 10,
    height: 10,
    format: "webp",
    quality: 50,
  });
};
