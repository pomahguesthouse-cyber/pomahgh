/**
 * Chatbot-related TypeScript types
 * Shared between frontend and admin modules
 */

// Chat message role
export type ChatRole = "user" | "assistant" | "system";

// Chat message
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
  conversation_id?: string;
}

// Chat conversation
export interface ChatConversation {
  id: string;
  session_id: string;
  guest_email: string | null;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  booking_created: boolean;
}

// Chatbot settings
export interface ChatbotSettings {
  id: string;
  persona: string;
  persona_name: string | null;
  persona_role: string | null;
  persona_traits: string[] | null;
  bot_name: string | null;
  greeting_message: string | null;
  communication_style: string | null;
  language_formality: string | null;
  emoji_usage: string | null;
  custom_instructions: string | null;
  enable_booking_assistance: boolean;
  enable_availability_check: boolean;
  enable_facility_info: boolean;
  primary_color: string | null;
  bot_avatar_url: string | null;
  bot_avatar_style: string | null;
  widget_position: string | null;
  show_typing_indicator: boolean;
  sound_enabled: boolean;
  max_message_length: number;
  response_speed: string | null;
  // Admin chatbot fields
  admin_persona_name: string | null;
  admin_persona_role: string | null;
  admin_persona_traits: string[] | null;
  admin_communication_style: string | null;
  admin_language_formality: string | null;
  admin_emoji_usage: string | null;
  admin_custom_instructions: string | null;
  admin_greeting_template: string | null;
}

// Knowledge base entry
export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  category: string | null;
  source_type: "manual" | "file" | "url";
  source_url: string | null;
  original_filename: string | null;
  tokens_count: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Training example
export interface TrainingExample {
  id: string;
  question: string;
  ideal_answer: string;
  category: string | null;
  response_tags: string[] | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Chat log for admin
export interface ChatLog {
  id: string;
  conversation_id: string;
  session_id: string;
  guest_email: string | null;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  booking_created: boolean;
  messages: ChatMessage[];
}

// Message rating for training
export interface MessageRating {
  id: string;
  message_id: string;
  rating: number | null;
  is_good_example: boolean;
  admin_notes: string | null;
  rated_by: string | null;
  created_at: string;
}

// WhatsApp session
export interface WhatsAppSession {
  id: string;
  phone_number: string;
  session_id: string;
  last_message_at: string;
  is_active: boolean;
  context: Record<string, unknown>;
}
