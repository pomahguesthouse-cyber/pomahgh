/**
 * Explore/City Attractions TypeScript types
 */

// City attraction category
export type AttractionCategory = 
  | "landmark"
  | "culinary"
  | "shopping"
  | "nature"
  | "culture"
  | "entertainment"
  | "religious"
  | "historical";

// City attraction
export interface CityAttraction {
  id: string;
  name: string;
  slug: string;
  category: AttractionCategory;
  description: string | null;
  long_description: string | null;
  image_url: string | null;
  gallery_images: string[] | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  travel_time_minutes: number | null;
  price_range: string | null;
  best_time_to_visit: string | null;
  tips: string | null;
  icon_name: string | null;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Nearby location (from hotel)
export interface NearbyLocation {
  id: string;
  name: string;
  category: string;
  icon_name: string;
  distance_km: number;
  travel_time_minutes: number;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Hero slide for explore page
export interface ExploreHeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  duration: number;
  display_order: number;
  show_overlay: boolean;
  overlay_opacity: number;
  overlay_gradient_from: string | null;
  overlay_gradient_to: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Facility
export interface Facility {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Facility hero slide
export interface FacilityHeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  duration: number;
  display_order: number;
  show_overlay: boolean;
  overlay_opacity: number;
  overlay_gradient_from: string | null;
  overlay_gradient_to: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
