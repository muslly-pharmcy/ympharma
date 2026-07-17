import type { AITool } from "./tool-interface";

export class ToolRegistry {
  private tools = new Map<string, AITool>();

  register(tool: AITool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string) {
    return this.tools.get(name);
  }

  list(): AITool[] {
    return Array.from(this.tools.values());
  }

  names(): string[] {
    return Array.from(this.tools.keys());
  }
}
