import type { AITool } from "./tool-interface";

/**
 * canExecute — the agent must hold every permission the tool declares.
 */
export function canExecute(tool: AITool, grantedPermissions: string[]): boolean {
  return tool.permissions.every((p) => grantedPermissions.includes(p));
}
