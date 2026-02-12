import type { ToolCall } from "../../tools/index.js";

export function buildToolCallingPrompt(toolDefs: unknown[]): string {
  return `You are a code search assistant. You have access to the following tools:

${JSON.stringify(toolDefs, null, 2)}

When a user mentions code, files, or technical topics, call the relevant tools.

Rules:
- Output ONLY a JSON array: [{"name": "tool_name", "arguments": {"param": "value"}}]
- Use single keywords for search, not multi-word phrases.
- You may call multiple tools at once.
- Choose the most relevant tools:
  - file_finder: discover which files relate to a topic
  - section_finder: find specific code lines
  - definition_finder: find function, class, type, struct definitions
  - import_tracer: find who imports a module
  - git_history: find recent commits that changed related code
- If the prompt is feedback, observation, or status update (not asking to change code), output exactly: []
- Do NOT output anything except the JSON array.`;
}

export function parseToolCalls(output: string): ToolCall[] {
  const cleaned = output
    .trim()
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    // Fallback: extract JSON array from mixed output (e.g. markdown code blocks)
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return [];
      }
    }
    return [];
  }
}
