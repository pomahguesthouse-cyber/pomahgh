export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ConversationContext {
  guest_name: string | null;
  preferred_room: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  guest_count: number | null;
  phone_number: string | null;
  email: string | null;
}

export interface TrainingPair {
  question: string;
  answer: string;
}
