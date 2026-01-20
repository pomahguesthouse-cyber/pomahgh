/**
 * Hooks - Central Export Hub
 * All custom React hooks are organized by domain
 * 
 * Domain-based organization:
 * - admin/   : Admin panel and management hooks
 * - auth/    : Authentication and authorization
 * - booking/ : Booking management and validation
 * - chatbot/ : Chatbot and conversation hooks
 * - room/    : Room data and features
 * - seo/     : SEO and search optimization
 * - explore/ : City exploration and attractions
 * - competitor/ : Competitor analysis
 * - shared/  : Shared utility hooks
 * 
 * Usage:
 * import { useAuth } from "@/hooks/auth";
 * import { useBooking } from "@/hooks/booking";
 * import { useRooms } from "@/hooks/room";
 * OR use direct domain imports for better tree-shaking
 */

// Admin hooks
export * from "./admin";

// Authentication hooks
export * from "./auth";

// Booking hooks
export * from "./booking";

// Chatbot hooks
export * from "./chatbot";

// Room hooks
export * from "./room";

// SEO hooks
export * from "./seo";

// Explore hooks
export * from "./explore";

// Competitor hooks
export * from "./competitor";

// Shared hooks
export * from "./shared";












