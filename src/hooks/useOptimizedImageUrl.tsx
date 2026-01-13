import { useMemo } from "react";

interface OptimizedUrlOptions {
  width?: number;
  height?: number;
  quality?: number;
}

interface OptimizedUrlResult {
  optimizedUrl: string;
  blurUrl: string;
  srcSet: string;
}

export const useOptimizedImageUrl = (
  originalUrl: string,
  options: OptimizedUrlOptions = {}
): OptimizedUrlResult => {
  const { width, height, quality = 80 } = options;

  return useMemo(() => {
    // Check if it's a Supabase storage URL
    const isSupabaseUrl = originalUrl?.includes("supabase.co/storage/v1/object/public/");

    if (!isSupabaseUrl || !originalUrl) {
      return {
        optimizedUrl: originalUrl || "",
        blurUrl: originalUrl || "",
        srcSet: "",
      };
    }

    // Convert to render URL for transformation
    const renderUrl = originalUrl.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );

    // Generate optimized URL
    const params = new URLSearchParams();
    if (width) params.set("width", width.toString());
    if (height) params.set("height", height.toString());
    params.set("quality", quality.toString());

    const optimizedUrl = `${renderUrl}?${params.toString()}`;

    // Generate blur placeholder URL (very small)
    const blurUrl = `${renderUrl}?width=20&quality=20`;

    // Generate srcSet for responsive images
    const widths = [320, 640, 768, 1024, 1280, 1920];
    const srcSet = widths
      .filter((w) => !width || w <= width * 2)
      .map((w) => `${renderUrl}?width=${w}&quality=${quality} ${w}w`)
      .join(", ");

    return {
      optimizedUrl,
      blurUrl,
      srcSet,
    };
  }, [originalUrl, width, height, quality]);
};

// Utility function for use outside React components
export const getOptimizedImageUrl = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80
): string => {
  if (!src?.includes("supabase.co/storage/v1/object/public/")) {
    return src;
  }

  const renderUrl = src.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  const params = new URLSearchParams();
  if (width) params.set("width", width.toString());
  if (height) params.set("height", height.toString());
  params.set("quality", quality.toString());

  return `${renderUrl}?${params.toString()}`;
};
