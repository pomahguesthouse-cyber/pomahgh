/**
 * Chatbot Feature Module
 * Exports all chatbot-related components and hooks
 */

// Components (re-export from chat index)
export { default as ChatbotWidget } from "@/components/ChatbotWidget";
export { ChatHeader, ChatInput, ChatMessages } from "@/components/chat";

// Hooks
export { useChatbot } from "@/hooks/useChatbot";
export { useVoiceInput } from "@/hooks/useVoiceInput";
export { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
export { useTrainingExamples } from "@/hooks/useTrainingExamples";

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
