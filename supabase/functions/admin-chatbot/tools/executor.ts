// ============= TOOL EXECUTOR =============

import { getAvailabilitySummary, getTodayGuests } from "./availability.ts";

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
