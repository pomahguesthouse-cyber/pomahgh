import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  placeholder?: "blur" | "skeleton" | "none";
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  /** Context hint for auto alt text (e.g., "room", "facility", "attraction") */
  context?: string;
}

/**
 * Generate SEO-friendly alt text from image URL when alt is empty
 * Strategy: Extract meaningful words from filename and path
 */
const generateSeoAltText = (src: string, context?: string): string => {
  if (!src) return "Gambar Pomah Guesthouse";
  
  try {
    // Extract filename from URL
    const url = new URL(src, window.location.origin);
    const pathname = url.pathname;
    
    // Get filename without extension
    const filename = pathname.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    
    // Extract bucket/folder context from Supabase URLs
    let folderContext = '';
    if (src.includes('supabase.co/storage')) {
      const pathParts = pathname.split('/');
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex !== -1 && pathParts[publicIndex + 1]) {
        folderContext = pathParts[publicIndex + 1]; // bucket name
      }
    }
    
    // Clean and format filename for readability
    const cleanedName = filename
      .replace(/[-_]/g, ' ')           // Replace dashes/underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capitals
      .replace(/\d{8,}/g, '')          // Remove long number sequences (timestamps)
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}/gi, '') // Remove UUIDs
      .replace(/\s+/g, ' ')            // Normalize spaces
      .trim();
    
    // Build SEO-optimized alt text
    const parts: string[] = [];
    
    // Add context if provided
    if (context) {
      const contextMap: Record<string, string> = {
        'room': 'Kamar',
        'facility': 'Fasilitas',
        'attraction': 'Wisata',
        'event': 'Event',
        'hero': 'Banner',
        'gallery': 'Galeri',
        'amenity': 'Fasilitas',
        'location': 'Lokasi',
      };
      parts.push(contextMap[context.toLowerCase()] || context);
    }
    
    // Add folder context if meaningful
    if (folderContext && !['images', 'public', 'uploads'].includes(folderContext.toLowerCase())) {
      const folderMap: Record<string, string> = {
        'rooms': 'Kamar',
        'facilities': 'Fasilitas',
        'attractions': 'Wisata',
        'events': 'Event',
        'hero-slides': 'Banner',
        'gallery': 'Galeri',
      };
      if (folderMap[folderContext.toLowerCase()]) {
        parts.push(folderMap[folderContext.toLowerCase()]);
      }
    }
    
    // Add cleaned filename if meaningful
    if (cleanedName && cleanedName.length > 2) {
      // Capitalize first letter of each word
      const formatted = cleanedName
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      if (formatted) {
        parts.push(formatted);
      }
    }
    
    // Add brand suffix for SEO
    parts.push('Pomah Guesthouse Semarang');
    
    // Remove duplicates and join
    const uniqueParts = [...new Set(parts)];
    return uniqueParts.join(' - ');
    
  } catch {
    // Fallback for invalid URLs
    return context 
      ? `${context} - Pomah Guesthouse Semarang`
      : 'Gambar Pomah Guesthouse Semarang';
  }
};

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
  context,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-generate SEO alt text if not provided
  const seoAlt = useMemo(() => {
    if (alt && alt.trim()) return alt;
    return generateSeoAltText(src, context);
  }, [alt, src, context]);

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
        rootMargin: "200px",
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
          alt={seoAlt}
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
