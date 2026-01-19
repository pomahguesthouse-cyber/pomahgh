// ============= TOOL EXECUTOR =============

import { getAvailabilitySummary, getTodayGuests } from "./availability.ts";

/**
 * Core tool executor
 */
export async function executeTool(supabase: any, toolName: string, args: any) {
  switch (toolName) {
    case "getAvailabilitySummary":
      return await getAvailabilitySummary(supabase, args.check_in, args.check_out);

    case "getTodayGuests":
      return await getTodayGuests(supabase, args.type, args.date);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Executor with validation & role awareness
 * (signature MUST match index.ts)
 */
export async function executeToolWithValidation(supabase: any, toolName: string, args: any, role?: string) {
  if (!toolName) {
    throw new Error("Tool name is required");
  }

  if (typeof args !== "object") {
    throw new Error("Tool arguments must be an object");
  }

  // Optional role-based guard (future-proof)
  if (role && role !== "manager" && role !== "admin") {
    throw new Error("Unauthorized tool access");
  }

  return await executeTool(supabase, toolName, args);
}
