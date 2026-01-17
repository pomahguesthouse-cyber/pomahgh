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
export { default as ChatLogsTab } from "@/components/admin/ChatLogsTab";

// Admin-specific tab components (default exports)
export { default as AdminKnowledgeBaseTab } from "@/components/admin/AdminKnowledgeBaseTab";
export { default as AdminPersonaSettingsTab } from "@/components/admin/AdminPersonaSettingsTab";
export { default as AdminTrainingTab } from "@/components/admin/AdminTrainingTab";
export { default as AdminWhatsAppSessionsTab } from "@/components/admin/AdminWhatsAppSessionsTab";

// Hooks
export { useAdminChatbot } from "@/hooks/useAdminChatbot";
export { useAdminKnowledgeBase } from "@/hooks/useAdminKnowledgeBase";
export { useAdminTrainingExamples } from "@/hooks/useAdminTrainingExamples";
export { useWhatsAppSessions } from "@/hooks/useWhatsAppSessions";

// Types
export type {
  ChatbotSettings,
  KnowledgeBaseEntry,
  TrainingExample,
  ChatLog,
  WhatsAppSession,
} from "@/types/chatbot.types";
