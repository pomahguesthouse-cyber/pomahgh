/**
 * Chatbot Settings Form Data
 * Typed interface for the chatbot settings form state.
 * Uses optional (?) instead of | null to match React HTML prop expectations.
 */
export interface ChatbotSettingsFormData {
  id?: string;
  persona: string;
  greeting_message?: string;
  bot_name?: string;
  bot_avatar_url?: string;
  bot_avatar_style?: string;
  primary_color?: string;
  response_speed?: string;
  enable_booking_assistance?: boolean;
  enable_availability_check?: boolean;
  enable_facility_info?: boolean;
  max_message_length?: number;
  show_typing_indicator?: boolean;
  sound_enabled?: boolean;
  widget_position?: string;
  persona_name?: string;
  persona_role?: string;
  persona_traits?: string[];
  communication_style?: string;
  emoji_usage?: string;
  language_formality?: string;
  custom_instructions?: string;
  admin_persona_name?: string;
  admin_persona_role?: string;
  admin_persona_traits?: string[];
  admin_communication_style?: string;
  admin_emoji_usage?: string;
  admin_language_formality?: string;
  admin_custom_instructions?: string;
  admin_greeting_template?: string;
}

export const DEFAULT_CHATBOT_FORM_DATA: ChatbotSettingsFormData = {
  persona: '',
  greeting_message: '',
  bot_name: '',
  bot_avatar_url: '',
  bot_avatar_style: 'circle',
  primary_color: '#8B4513',
  response_speed: 'balanced',
  enable_booking_assistance: true,
  enable_availability_check: true,
  enable_facility_info: true,
  max_message_length: 500,
  show_typing_indicator: true,
  sound_enabled: false,
  widget_position: 'bottom-right',
};
