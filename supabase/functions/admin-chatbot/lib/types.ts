// ============= TYPE DEFINITIONS =============

import type { ManagerRole } from "./constants.ts";

export interface AuthResult {
  isAuthorized: boolean;
  adminId: string | null;
  adminEmail: string | null;
  managerName: string;
  managerRole: ManagerRole;
  error?: string;
  status?: number;
}

export interface HotelSettings {
  hotel_name: string;
  check_in_time: string;
  check_out_time: string;
}

export interface PersonaSettings {
  name: string;
  role: string;
  traits: string[];
  commStyle: string;
  formality: string;
  emojiUsage: string;
  customInstructions: string;
  greetingTemplate: string;
}

export interface KnowledgeItem {
  title: string;
  content: string | null;
  category: string | null;
}

export interface TrainingExample {
  question: string;
  ideal_answer: string;
  category: string | null;
}

export interface ChatContext {
  hotelSettings: HotelSettings;
  personaSettings: PersonaSettings;
  knowledgeItems: KnowledgeItem[];
  trainingExamples: TrainingExample[];
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolExecution {
  tool_name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  success: boolean;
  executed_at: string;
}

export interface AuditLogData {
  adminId: string;
  adminEmail: string | null;
  sessionId: string;
  userMessage: string;
  executedTools: ToolExecution[];
  ipAddress: string;
  userAgent: string;
  startTime: number;
}

export interface DateReferences {
  today: string;
  tomorrow: string;
  lusa: string;
  nextWeek: string;
  weekend: string;
}
