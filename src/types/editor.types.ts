export interface ThemeConfig {
  id: string;
  name: string;
  is_active: boolean;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_background: string;
  color_foreground: string;
  color_muted: string;
  color_card: string;
  font_heading: string;
  font_body: string;
  font_size_base: number;
  section_padding: string;
  container_width: string;
  border_radius: string;
  header_style: 'transparent' | 'solid' | 'gradient';
  header_sticky: boolean;
  created_at: string;
  updated_at: string;
}

export interface WidgetSettings {
  background_color?: string;
  padding_top?: string;
  padding_bottom?: string;
  animation?: 'none' | 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right';
  custom_classes?: string;
  title_override?: string;
  subtitle_override?: string;
  columns?: number;
  sticky?: boolean;
  transparent?: boolean;
  [key: string]: unknown;
}

export interface WidgetConfig {
  id: string;
  widget_id: string;
  enabled: boolean;
  sort_order: number;
  settings: WidgetSettings;
  created_at: string;
  updated_at: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  theme_config: Partial<ThemeConfig>;
  widget_config: WidgetConfig[];
  is_system: boolean;
  created_at: string;
}

export type WidgetId = 
  | 'header' 
  | 'hero' 
  | 'welcome' 
  | 'google_rating' 
  | 'rooms' 
  | 'amenities' 
  | 'location' 
  | 'contact' 
  | 'footer';

export const WIDGET_LABELS: Record<WidgetId, string> = {
  header: 'Header',
  hero: 'Hero Banner',
  welcome: 'Welcome Section',
  google_rating: 'Google Rating',
  rooms: 'Rooms',
  amenities: 'Amenities',
  location: 'Location',
  contact: 'Contact',
  footer: 'Footer',
};

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
  { value: 'Lora', label: 'Lora (Classic)' },
  { value: 'Poppins', label: 'Poppins (Clean)' },
  { value: 'Merriweather', label: 'Merriweather (Readable)' },
  { value: 'Roboto', label: 'Roboto (Neutral)' },
];

export const ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fade-up', label: 'Fade Up' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
];
