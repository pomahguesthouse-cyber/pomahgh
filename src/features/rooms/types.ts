/**
 * Room Feature Types
 */

export interface RoomPromotion {
  id: string;
  room_id: string;
  name: string;
  description: string | null;
  promo_price: number | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  min_nights: number;
  promo_code: string | null;
  badge_text: string;
  badge_color: string;
  priority: number;
}

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
  active_promotion?: RoomPromotion | null;
}

export interface RoomAddon {
  id: string;
  room_id: string | null;
  name: string;
  description: string | null;
  price: number;
  price_type: string;
  icon_name: string;
  is_active: boolean;
  max_quantity: number;
  extra_capacity: number;
  category: string | null;
  display_order: number;
}

export interface RoomPanorama {
  id: string;
  room_id: string;
  image_url: string;
  title: string | null;
  display_order: number;
  is_active: boolean;
}

export interface RoomHotspot {
  id: string;
  panorama_id: string;
  pitch: number;
  yaw: number;
  type: string;
  text: string | null;
  target_panorama_id: string | null;
  css_class: string | null;
}
