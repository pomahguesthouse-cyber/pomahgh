/**
 * Chatbot Feature Module
 * Exports all chatbot-related components and hooks
 */

// Components (re-export from chat index)
export { ChatbotWidget } from "@/components/ChatbotWidget";
export { ChatHeader, ChatInput, ChatMessages } from "@/components/chat";

// Hooks
export { useChatbot } from "@/hooks/chatbot/useChatbot";
export { useVoiceInput } from "@/hooks/chatbot/useVoiceInput";
export { useKnowledgeBase } from "@/hooks/chatbot/useKnowledgeBase";
export { useTrainingExamples } from "@/hooks/chatbot/useTrainingExamples";

// Types
export type {
  ChatMessage,
  ChatConversation,
  ChatRole,
  ChatbotSettings,
  KnowledgeBaseEntry,
  TrainingExample,
  ChatLog,
  MessageRating,
  WhatsAppSession,
} from "@/types/chatbot.types";












