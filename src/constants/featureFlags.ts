/**
 * Feature Flags - Centralized feature toggle configuration
 */

export const FEATURE_FLAGS = {
  // Booking
  ENABLE_INSTANT_BOOKING: true,
  ENABLE_PAYMENT_GATEWAY: true,
  ENABLE_EMAIL_CONFIRMATION: true,

  // Admin
  ENABLE_ANALYTICS: true,
  ENABLE_COMPETITOR_ANALYSIS: true,
  ENABLE_PRICE_OPTIMIZATION: true,

  // Chatbot
  ENABLE_CHATBOT: true,
  ENABLE_AI_TRAINING: true,
  ENABLE_VOICE_INPUT: false,

  // SEO
  ENABLE_SEO_CHECKER: true,
  ENABLE_SEARCH_CONSOLE: true,

  // UI
  ENABLE_DARK_MODE: false,
  ENABLE_MULTILINGUAL: false,

  // Development
  ENABLE_DEV_TOOLS: false,
  ENABLE_MOCK_API: false,
} as const;

export const isFeatureEnabled = (featureName: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[featureName] === true;
};
