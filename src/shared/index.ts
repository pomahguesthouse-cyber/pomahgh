/**
 * Shared Module - Central Export
 * Reusable components and hooks across the application
 */

// UI components are imported directly from @/components/ui/

// Shared components (named exports)
export { default as Header } from "@/components/Header";
export { Footer } from "@/components/Footer";
export { default as Hero } from "@/components/Hero";
export { Breadcrumb } from "@/components/Breadcrumb";
export { ImageGallery } from "@/components/ImageGallery";
export { GoogleRating } from "@/components/GoogleRating";
export { ReviewSlider } from "@/components/ReviewSlider";
export { Contact } from "@/components/Contact";
export { Location } from "@/components/Location";
export { Amenities } from "@/components/Amenities";
export { Welcome } from "@/components/Welcome";
export { GlobalSEO } from "@/components/GlobalSEO";
export { NavLink } from "@/components/NavLink";

// Viewers
export { FloorPlanViewer } from "@/components/FloorPlanViewer";
export { Panorama360Viewer } from "@/components/Panorama360Viewer";
export { VirtualTourViewer } from "@/components/VirtualTourViewer";

// Shared hooks
export { useIsMobile } from "@/hooks/use-mobile";
export { useToast, toast } from "@/hooks/use-toast";
export { useOptimizedImageUrl } from "@/hooks/useOptimizedImageUrl";
export { useGoogleRating } from "@/hooks/useGoogleRating";
export { useHeroSlides } from "@/hooks/useHeroSlides";

// Context
export { SearchDatesProvider, useSearchDates } from "@/contexts/SearchDatesContext";
