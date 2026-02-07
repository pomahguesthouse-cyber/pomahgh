export interface ChatbotSettings {
  persona_name: string;
  persona_role: string;
  persona_traits: string[];
  communication_style: string;
  emoji_usage: string;
  language_formality: string;
  greeting_message: string;
  response_speed?: 'fast' | 'standard' | 'detailed';
  custom_instructions?: string;
}

export interface HotelSettings {
  hotel_name: string;
  address: string;
  check_in_time: string;
  check_out_time: string;
  whatsapp_number: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  price_per_night: number;
  max_guests: number;
  features?: string[];
  size_sqm?: number;
}

export interface RoomAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  price_type: string;
  category?: string;
  room_id: string | null;
  max_quantity?: number;
  extra_capacity?: number;
}

export interface Facility {
  title: string;
  description: string;
}

export interface NearbyLocation {
  name: string;
  category: string;
  distance_km: number;
  travel_time_minutes: number;
}

export interface KnowledgeItem {
  title: string;
  content: string;
  category?: string;
}

export interface TrainingExample {
  question: string;
  ideal_answer: string;
  category?: string;
}

export interface HotelData {
  settings: HotelSettings;
  rooms: Room[];
  addons: RoomAddon[];
  facilities: Facility[];
  nearbyLocations: NearbyLocation[];
  knowledgeBase: KnowledgeItem[];
  trainingExamples: TrainingExample[];
}

export interface ParsedDate {
  check_in: string;
  check_out: string;
  description: string;
}

export interface ConversationContext {
  guest_name?: string;
  preferred_room?: string;
  check_in_date?: string;
  check_out_date?: string;
  dates_mentioned?: string;
  guest_count?: number;
  sentiment?: string;
  awaiting_guest_data?: boolean;
  parsed_date?: ParsedDate;
}

export interface PromptConfig {
  settings: ChatbotSettings;
  hotelData: HotelData;
  conversationContext?: ConversationContext;
  lastUserMessage?: string;
}

export const DEFAULT_CHATBOT_SETTINGS: ChatbotSettings = {
  persona_name: 'Rani',
  persona_role: 'Customer Service',
  persona_traits: ['ramah', 'profesional', 'helpful'],
  communication_style: 'santai-profesional',
  emoji_usage: 'moderate',
  language_formality: 'semi-formal',
  greeting_message: "Halo! 👋 Ada yang bisa saya bantu?"
};

export const DEFAULT_HOTEL_SETTINGS: HotelSettings = {
  hotel_name: 'Pomah Guesthouse',
  address: 'Jl. Dewi Sartika IV No 71, Semarang',
  check_in_time: '14:00',
  check_out_time: '12:00',
  whatsapp_number: '+6281227271799'
};
