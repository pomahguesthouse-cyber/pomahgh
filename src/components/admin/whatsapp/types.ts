import type { LucideIcon } from 'lucide-react';

export type WhatsAppMode = 'ai' | 'manual';

export type StatVariant = 'default' | 'success' | 'warning' | 'destructive';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: StatVariant;
}

export interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string | null;
  variant?: 'guest' | 'admin';
}

export interface ChatMessage {
  id: string;
  content: string;
  role: string;
  created_at: string | null;
  conversation_id: string | null;
}
