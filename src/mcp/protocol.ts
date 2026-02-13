const CONTEXT_MARKER = "Context from codebase:";

export const PROMPTSCOUT_TOOL_NAME = "promptscout_enrich";

export interface McpRequestDependencies {
  enrichPrompt: (prompt: string, projectDir: string) => Promise<string>;
  cwd: () => string;
  serverVersion: string;
}

export interface ContextSummary {
  files: number;
  sections: number;
  definitions: number;
  imports: number;
  commits: number;
}

export interface ToolCallInput {
  prompt: string;
  projectDir?: string;
}

export interface ToolCallResultPayload extends Record<string, unknown> {
  tool: typeof PROMPTSCOUT_TOOL_NAME;
  prompt: string;
  projectDir: string;
  hasContext: boolean;
  summary: ContextSummary;
  improved: string;
}

export interface McpToolResult extends Record<string, unknown> {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  structuredContent?: ToolCallResultPayload;
}

function extractContextBlock(text: string): string {
  const markerIndex = text.indexOf(CONTEXT_MARKER);
  if (markerIndex < 0) return "";
  return text.slice(markerIndex + CONTEXT_MARKER.length).trim();
}

function countTaggedLines(
  contextText: string,
  tag: string,
  lineFilter?: (line: string) => boolean,
): number {
  const blockRegex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
  let total = 0;
  let match: RegExpExecArray | null = blockRegex.exec(contextText);

  while (match !== null) {
    const lines = match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const filtered = lineFilter ? lines.filter(lineFilter) : lines;
    total += filtered.length;

    match = blockRegex.exec(contextText);
  }

  return total;
}

export function extractContextSummary(improved: string): ContextSummary {
  const context = extractContextBlock(improved);
  if (!context) {
    return {
      files: 0,
      sections: 0,
      definitions: 0,
      imports: 0,
      commits: 0,
    };
  }

  return {
    files: countTaggedLines(context, "file_finder"),
    sections: countTaggedLines(context, "section_finder"),
    definitions: countTaggedLines(context, "definition_finder"),
    imports: countTaggedLines(context, "import_tracer"),
    commits: countTaggedLines(
      context,
      "git_history",
      (line) => /^[0-9a-f]{7,40}\s/.test(line),
    ),
  };
}

export async function runPromptscoutTool(
  input: ToolCallInput,
  deps: McpRequestDependencies,
): Promise<McpToolResult> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    return {
      content: [
        {
          type: "text",
          text: "promptscout failed: Tool argument 'prompt' must be a non-empty string.",
        },
      ],
      isError: true,
    };
  }

  const projectDir = input.projectDir?.trim() ? input.projectDir : deps.cwd();

  try {
    const improved = await deps.enrichPrompt(prompt, projectDir);
    const payload: ToolCallResultPayload = {
      tool: PROMPTSCOUT_TOOL_NAME,
      prompt,
      projectDir,
      hasContext: improved.includes(CONTEXT_MARKER),
      summary: extractContextSummary(improved),
      improved,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2),
        },
      ],
      structuredContent: payload,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown promptscout error.";
    return {
      content: [
        {
          type: "text",
          text: `promptscout failed: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
