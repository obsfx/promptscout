import type { ToolCall } from "../../tools/index.js";
import { jsonrepair } from "jsonrepair";

export function buildToolCallingPrompt(toolDefs: unknown[]): string {
  return `You are a code search assistant. You have access to the following tools:

${JSON.stringify(toolDefs, null, 2)}

When a user mentions code, files, or technical topics, call the relevant tools.

Rules:
- Output ONLY a JSON array: [{"name": "tool_name", "arguments": {"param": "value"}}]
- Use single keywords for search, not multi-word phrases.
- ALWAYS call 2-3 tools. file_finder alone is never enough. Combine with section_finder, definition_finder, or git_history.
- If the prompt is feedback, observation, or status update (not asking to change code), output exactly: []
- Do NOT output anything except the JSON array.

Tools:
- file_finder: discover which files relate to a topic
- section_finder: find specific code lines matching a keyword
- definition_finder: find function, class, type, struct definitions
- import_tracer: find who imports a module
- git_history: find recent commits that changed related code

Example input: "refactor the auth module and check for recent changes"
Example output: [{"name":"file_finder","arguments":{"query":"auth"}},{"name":"definition_finder","arguments":{"query":"auth"}},{"name":"git_history","arguments":{"query":"auth"}}]

Example input: "that didn't work, the screen is still broken"
Example output: []`;
}

function normalizeToolCall(item: Record<string, unknown>): ToolCall | null {
  const name = item.name ?? item.function;
  const args = item.arguments;
  if (typeof name !== "string" || typeof args !== "object" || args === null) {
    return null;
  }
  return { name, arguments: args as Record<string, string> };
}

function extractValidCalls(parsed: unknown): ToolCall[] {
  if (!Array.isArray(parsed)) return [];
  const calls: ToolCall[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const call = normalizeToolCall(item as Record<string, unknown>);
    if (call) calls.push(call);
  }
  return calls;
}

function stripCodeBlocks(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  return match ? match[1].trim() : text;
}

function tryParse(text: string): ToolCall[] | null {
  try {
    return extractValidCalls(JSON.parse(text));
  } catch {
    return null;
  }
}

export function parseToolCalls(output: string): ToolCall[] {
  let cleaned = output.trim();

  // Strip model-specific tokens
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "");
  cleaned = cleaned.replace(/\[TOOL_CALLS\]/g, "");
  cleaned = cleaned.trim();

  // 1. Empty array at start means "no tools" — ignore trailing noise
  if (cleaned.startsWith("[]")) return [];

  // 2. Direct parse (clean JSON output)
  const direct = tryParse(cleaned);
  if (direct) return direct;

  // 3. Extract from markdown code blocks
  const fromBlock = tryParse(stripCodeBlocks(cleaned));
  if (fromBlock) return fromBlock;

  // 4. Repair broken JSON (trailing commas, missing quotes, etc.)
  try {
    const repaired = jsonrepair(cleaned);
    return extractValidCalls(JSON.parse(repaired));
  } catch {
    return [];
  }
}
