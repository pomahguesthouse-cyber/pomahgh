/**
 * Shared Module - Central Export
 * Reusable components and hooks across the application
 */

// UI components are imported directly from @/components/ui/

// Shared components (named exports)
export { Header } from "@/components/layout/Header";
export { Footer } from "@/components/layout/Footer";
export { Hero } from "@/components/hero/Hero";
export { Breadcrumb } from "@/components/common/Breadcrumb";
export { ImageGallery } from "@/components/gallery/ImageGallery";
export { GoogleRating } from "@/components/common/GoogleRating";
export { ReviewSlider } from "@/components/hero/ReviewSlider";
export { Contact } from "@/components/common/Contact";
export { Location } from "@/components/common/Location";
export { Amenities } from "@/components/common/Amenities";
export { Welcome } from "@/components/hero/Welcome";
export { GlobalSEO } from "@/components/common/GlobalSEO";
export { NavLink } from "@/components/layout/NavLink";

// Viewers
export { FloorPlanViewer } from "@/components/gallery/FloorPlanViewer";
export { Panorama360Viewer } from "@/components/gallery/Panorama360Viewer";
export { VirtualTourViewer } from "@/components/gallery/VirtualTourViewer";

// Shared hooks
export { useIsMobile } from "@/hooks/shared/useMobile";
export { useToast, toast } from "@/hooks/shared/useToast";
export { useOptimizedImageUrl } from "@/hooks/shared/useOptimizedImageUrl";
export { useGoogleRating } from "@/hooks/shared/useGoogleRating";
export { useHeroSlides } from "@/hooks/shared/useHeroSlides";

// Context
export { SearchDatesProvider, useSearchDates } from "@/contexts/SearchDatesContext";












