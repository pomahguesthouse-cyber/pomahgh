// ============= TOOL FILTERING BY ROLE =============

import { ROLE_TOOL_ACCESS, type ManagerRole } from "./constants.ts";
import type { ToolDefinition } from "./types.ts";

/**
 * Filter tools based on manager role
 * Returns only tools that the role is allowed to use
 */
export function filterToolsByRole(
  tools: ToolDefinition[], 
  role: ManagerRole
): ToolDefinition[] {
  const allowedToolNames = ROLE_TOOL_ACCESS[role] || ROLE_TOOL_ACCESS.viewer;
  
  if (allowedToolNames === 'all') {
    console.log(`Manager role: ${role}, allowed tools: ALL (${tools.length})`);
    return tools;
  }
  
  const filtered = tools.filter(t => 
    (allowedToolNames as string[]).includes(t.function.name)
  );
  
  console.log(`Manager role: ${role}, allowed tools: ${filtered.length}/${tools.length}`);
  return filtered;
}

/**
 * Check if a specific tool is allowed for a role
 * Used for re-validation before tool execution
 */
export function isToolAllowed(toolName: string, role: ManagerRole): boolean {
  const allowedToolNames = ROLE_TOOL_ACCESS[role];
  
  if (allowedToolNames === 'all') return true;
  
  return (allowedToolNames as string[]).includes(toolName);
}
