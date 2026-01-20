import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  placeholder?: "blur" | "skeleton" | "none";
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const generateOptimizedUrl = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80
): string => {
  // Check if it's a Supabase storage URL
  if (src.includes("supabase.co/storage/v1/object/public/")) {
    // Convert to render URL for transformation
    const renderUrl = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    const params = new URLSearchParams();
    if (width) params.set("width", width.toString());
    if (height) params.set("height", height.toString());
    params.set("quality", quality.toString());
    
    return `${renderUrl}?${params.toString()}`;
  }
  return src;
};

const generateBlurUrl = (src: string): string => {
  if (src.includes("supabase.co/storage/v1/object/public/")) {
    const renderUrl = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    return `${renderUrl}?width=20&quality=20`;
  }
  return src;
};

export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  quality = 80,
  priority = false,
  placeholder = "blur",
  fallbackSrc = "/placeholder.svg",
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const optimizedSrc = generateOptimizedUrl(src, width, height, quality);
  const blurSrc = generateBlurUrl(src);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? fallbackSrc : optimizedSrc;

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Placeholder */}
      {!isLoaded && placeholder === "skeleton" && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {!isLoaded && placeholder === "blur" && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-opacity duration-300"
          style={{ opacity: isLoaded ? 0 : 1 }}
        />
      )}

      {/* Main Image */}
      {isInView && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};












