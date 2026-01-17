/**
 * Shared Module - Central Export
 * Reusable components and hooks across the application
 */

// UI components are imported directly from @/components/ui/

// Shared components
export { default as Header } from "@/components/Header";
export { default as Footer } from "@/components/Footer";
export { default as Hero } from "@/components/Hero";
export { Breadcrumb } from "@/components/Breadcrumb";
export { default as ImageGallery } from "@/components/ImageGallery";
export { GoogleRating } from "@/components/GoogleRating";
export { default as ReviewSlider } from "@/components/ReviewSlider";
export { default as Contact } from "@/components/Contact";
export { default as Location } from "@/components/Location";
export { default as Amenities } from "@/components/Amenities";
export { default as Welcome } from "@/components/Welcome";
export { GlobalSEO } from "@/components/GlobalSEO";
export { NavLink } from "@/components/NavLink";

// Viewers
export { FloorPlanViewer } from "@/components/FloorPlanViewer";
export { default as Panorama360Viewer } from "@/components/Panorama360Viewer";
export { VirtualTourViewer } from "@/components/VirtualTourViewer";

// Shared hooks
export { useMobile, useIsMobile } from "@/hooks/use-mobile";
export { useToast, toast } from "@/hooks/use-toast";
export { useOptimizedImageUrl } from "@/hooks/useOptimizedImageUrl";
export { useGoogleRating } from "@/hooks/useGoogleRating";
export { useHeroSlides } from "@/hooks/useHeroSlides";

// Context
export { SearchDatesProvider, useSearchDates } from "@/contexts/SearchDatesContext";
