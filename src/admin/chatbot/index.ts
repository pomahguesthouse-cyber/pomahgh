/**
 * Admin Chatbot Module
 * Chatbot management components and hooks
 */

// Widget components
export { AdminChatbotWidget } from "@/components/admin/AdminChatbotWidget";
export { AdminChatbotDialog } from "@/components/admin/AdminChatbotDialog";

// Tab components (default exports)
export { default as KnowledgeBaseTab } from "@/components/admin/KnowledgeBaseTab";
export { default as PersonaSettingsTab } from "@/components/admin/PersonaSettingsTab";
export { default as TrainingTab } from "@/components/admin/TrainingTab";
export { default as WhatsAppSessionsTab } from "@/components/admin/WhatsAppSessionsTab";

// Admin-specific tab components (default exports)
export { default as AdminKnowledgeBaseTab } from "@/components/admin/AdminKnowledgeBaseTab";
export { default as AdminPersonaSettingsTab } from "@/components/admin/AdminPersonaSettingsTab";
export { default as AdminTrainingTab } from "@/components/admin/AdminTrainingTab";
export { default as AdminWhatsAppSessionsTab } from "@/components/admin/AdminWhatsAppSessionsTab";
export { default as WhatsAppLearningTab } from "@/components/admin/WhatsAppLearningTab";

// Hooks
export { useAdminChatbot } from "@/hooks/useAdminChatbot";
export { useAdminKnowledgeBase } from "@/hooks/useAdminKnowledgeBase";
export { useAdminTrainingExamples } from "@/hooks/useAdminTrainingExamples";
export { useWhatsAppSessions } from "@/hooks/useWhatsAppSessions";
export {
  useDeepAnalyze,
  useDetectFAQ,
  useDetectSlang,
  usePromoteFAQ,
  useConversationInsights,
  useFAQPatterns,
  useLearningMetrics,
  useLearningReport,
} from "@/hooks/useWhatsAppLearning";

// Types
export type {
  ChatbotSettings,
  KnowledgeBaseEntry,
  TrainingExample,
  ChatLog,
  WhatsAppSession,
} from "@/types/chatbot.types";
