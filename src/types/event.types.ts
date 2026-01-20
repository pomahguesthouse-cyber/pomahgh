/**
 * City Events TypeScript types
 */

// Event category
export type EventCategory = 
  | "festival"
  | "konser"
  | "pameran"
  | "olahraga"
  | "budaya"
  | "kuliner"
  | "keagamaan"
  | "lainnya";

// City event
export interface CityEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  image_url: string | null;
  image_alt: string | null;
  gallery_images: string[] | null;
  gallery_alts: Record<string, string> | null;
  venue: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  event_end_date: string | null;
  event_time: string | null;
  price_range: string | null;
  organizer: string | null;
  contact_info: string | null;
  website_url: string | null;
  icon_name: string | null;
  category: EventCategory;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Event categories for UI
export const eventCategories = [
  { value: "festival", label: "Festival" },
  { value: "konser", label: "Konser" },
  { value: "pameran", label: "Pameran" },
  { value: "olahraga", label: "Olahraga" },
  { value: "budaya", label: "Budaya" },
  { value: "kuliner", label: "Kuliner" },
  { value: "keagamaan", label: "Keagamaan" },
  { value: "lainnya", label: "Lainnya" },
] as const;
