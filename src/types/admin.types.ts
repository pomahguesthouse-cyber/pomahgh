/**
 * Admin-related TypeScript types
 */

// Bank account for payments
export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  is_active: boolean;
  display_order: number | null;
  created_at?: string;
  updated_at?: string;
}

// Hotel settings
export interface HotelSettings {
  id: string;
  hotel_name: string;
  tagline: string | null;
  description: string | null;
  about_us: string | null;
  address: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email_primary: string | null;
  email_reservations: string | null;
  whatsapp_number: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  invoice_logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  min_stay_nights: number | null;
  max_stay_nights: number | null;
  currency_symbol: string | null;
  currency_code: string | null;
  tax_rate: number | null;
  tax_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  payment_instructions: string | null;
  refund_policy_enabled: boolean;
  refund_policy_type: string | null;
  refund_policy_text: string | null;
  full_refund_days_before: number | null;
  partial_refund_days_before: number | null;
  partial_refund_percentage: number | null;
  no_refund_days_before: number | null;
  hotel_policies_enabled: boolean;
  hotel_policies_text: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  header_bg_color: string | null;
  header_text_color: string | null;
  header_bg_opacity: number | null;
  header_blur: number | null;
  header_show_logo: boolean;
  reception_hours_start: string | null;
  reception_hours_end: string | null;
  whatsapp_response_mode: string | null;
  whatsapp_session_timeout_minutes: number | null;
  whatsapp_manager_numbers: unknown[] | null;
  whatsapp_contact_numbers: unknown[] | null;
  whatsapp_ai_whitelist: string[] | null;
}

// SEO settings
export interface SeoSettings {
  id: string;
  page_key: string;
  title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  keywords: string[] | null;
  canonical_url: string | null;
  robots: string | null;
  json_ld: unknown | null;
  is_active: boolean;
}

// Invoice template
export interface InvoiceTemplate {
  id: string;
  show_logo: boolean;
  invoice_primary_color: string | null;
  invoice_secondary_color: string | null;
  footer_text: string | null;
  custom_notes: string | null;
  show_bank_accounts: boolean;
  whatsapp_template: string | null;
}

// Channel manager
export interface ChannelManager {
  id: string;
  name: string;
  type: string;
  api_endpoint: string | null;
  api_key_secret: string | null;
  auth_type: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  max_retries: number;
  retry_delay_seconds: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_at?: string;
  updated_at?: string;
}

// Competitor hotel
export interface CompetitorHotel {
  id: string;
  name: string;
  address: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  distance_km: number | null;
  notes: string | null;
  scrape_url: string | null;
  scrape_enabled: boolean;
  last_scraped_at: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Competitor room
export interface CompetitorRoom {
  id: string;
  competitor_hotel_id: string;
  room_name: string;
  room_type: string | null;
  max_guests: number | null;
  comparable_room_id: string | null;
  notes: string | null;
  is_active: boolean;
  competitor_hotels?: CompetitorHotel;
  rooms?: { name: string };
}

// Price survey
export interface CompetitorPriceSurvey {
  id: string;
  competitor_room_id: string;
  price: number;
  survey_date: string;
  price_source: string | null;
  notes: string | null;
  surveyed_by: string | null;
  created_at?: string;
  competitor_rooms?: CompetitorRoom;
}

// User role
export interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "manager" | "staff";
  created_at?: string;
}

// Admin notification
export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}












