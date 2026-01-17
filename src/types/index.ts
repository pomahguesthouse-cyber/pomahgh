/**
 * Central type exports for Pomah Guesthouse
 * Import types from here for consistency across the application
 */

// Re-export all booking types
export * from "./booking.types";

// Re-export all room types
export * from "./room.types";

// Re-export all chatbot types
export * from "./chatbot.types";

// Re-export all admin types
export * from "./admin.types";

// Re-export all explore types
export * from "./explore.types";

// Re-export database types (auto-generated)
export type { Database, Json } from "@/integrations/supabase/types";
