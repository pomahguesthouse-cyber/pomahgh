/**
 * Room-related TypeScript types
 * Shared between frontend and admin modules
 */

// Room promotion from room_promotions table
export interface RoomPromotion {
  id: string;
  room_id: string;
  name: string;
  description: string | null;
  promo_price: number | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean | null;
  min_nights: number;
  promo_code: string | null;
  badge_text: string | null;
  badge_color: string | null;
  priority: number;
}

// Core room interface
export interface Room {
  id: string;
  name: string;
  slug?: string | null;
  description: string;
  price_per_night: number;
  max_guests: number;
  features: string[];
  image_url: string;
  image_urls: string[];
  virtual_tour_url: string | null;
  available: boolean;
  size_sqm: number | null;
  room_count: number;
  room_numbers: string[] | null;
  allotment: number;
  base_price: number | null;
  final_price: number | null;
  promo_price: number | null;
  promo_start_date: string | null;
  promo_end_date: string | null;
  monday_price: number | null;
  tuesday_price: number | null;
  wednesday_price: number | null;
  thursday_price: number | null;
  friday_price: number | null;
  saturday_price: number | null;
  sunday_price: number | null;
  transition_effect?: string | null;
  floor_plan_url?: string | null;
  floor_plan_enabled?: boolean | null;
  is_non_refundable?: boolean | null;
  monday_non_refundable?: boolean | null;
  tuesday_non_refundable?: boolean | null;
  wednesday_non_refundable?: boolean | null;
  thursday_non_refundable?: boolean | null;
  friday_non_refundable?: boolean | null;
  saturday_non_refundable?: boolean | null;
  sunday_non_refundable?: boolean | null;
  use_autopricing?: boolean | null;
  active_promotion?: RoomPromotion | null;
}

// Room feature definition
export interface RoomFeature {
  id: string;
  feature_key: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

// Room image for gallery
export interface RoomImage {
  url: string;
  alt: string;
}

// Room addon
export interface RoomAddon {
  id: string;
  room_id: string | null;
  name: string;
  description: string | null;
  price: number;
  price_type: "per_night" | "one_time" | "per_person";
  category: string | null;
  icon_name: string | null;
  is_active: boolean;
  display_order: number;
  max_quantity: number;
  extra_capacity: number | null;
}

// Room panorama for 360 view
export interface RoomPanorama {
  id: string;
  room_id: string;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  is_active: boolean;
  floor_plan_x: number | null;
  floor_plan_y: number | null;
  floor_plan_icon: string | null;
}

// Room hotspot for virtual tour
export interface RoomHotspot {
  id: string;
  room_id: string;
  panorama_id: string | null;
  title: string;
  description: string | null;
  yaw: number;
  pitch: number;
  hotspot_type: "info" | "link" | "navigation";
  icon_name: string | null;
  feature_key: string | null;
  target_room_id: string | null;
  target_panorama_id: string | null;
  display_order: number;
  is_active: boolean;
}

// Admin room for management
export interface AdminRoom extends Room {
  created_at?: string;
  updated_at?: string;
}

// Room unavailable date
export interface RoomUnavailableDate {
  id: string;
  room_id: string;
  unavailable_date: string;
  reason?: string | null;
  created_at?: string;
}
