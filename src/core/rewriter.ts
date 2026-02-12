import type { ConfigRepo } from "../storage/config-repo.js";
import type { InferenceParams } from "../types.js";
import { generate } from "../llm/inference.js";
import {
  buildToolCallingPrompt,
  parseToolCalls,
} from "../llm/prompts/tool-calling.js";
import {
  type ToolCall,
  TOOL_DEFINITIONS,
  executeToolCall,
  loadIgnoreFilter,
} from "../tools/index.js";

const TOOL_CALLING_PARAMS: InferenceParams = {
  temperature: 0.1,
  topP: 0.9,
  topK: 20,
  minP: 0.0,
  repeatPenalty: {
    lastTokens: 64,
    penalty: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    penalizeNewLine: false,
  },
};

const NO_RESULT_PREFIXES = ["No ", "Failed", "Unknown tool"];

function isEmptyResult(result: string): boolean {
  return NO_RESULT_PREFIXES.some((prefix) => result.startsWith(prefix));
}

function formatToolResult(call: ToolCall, result: string): string {
  const param = call.arguments.url ?? call.arguments.query;
  return `<${call.name} query="${param}">\n${result}\n</${call.name}>`;
}

export class Rewriter {
  constructor(private configRepo: ConfigRepo) { }

  getModelUri(): string {
    return this.configRepo.getModelHfUri();
  }

  async rewrite(
    rawPrompt: string,
    projectDir?: string,
    onStatus?: (message: string) => void,
  ): Promise<string> {
    const hfUri = this.configRepo.getModelHfUri();
    const contextSize = this.configRepo.getModelContextSize();
    const searchDir = projectDir ?? process.cwd();

    onStatus?.("Evaluating");

    const systemPrompt = buildToolCallingPrompt(TOOL_DEFINITIONS);
    const raw = await generate(
      systemPrompt,
      rawPrompt,
      hfUri,
      contextSize,
      TOOL_CALLING_PARAMS,
    );

    const calls = parseToolCalls(raw);
    if (calls.length === 0) return rawPrompt;

    const ig = loadIgnoreFilter(searchDir);
    const results: string[] = [];

    for (const call of calls) {
      const param = call.arguments.url ?? call.arguments.query;
      onStatus?.(`Called ${call.name}(${param})`);
      const result = await executeToolCall(call, searchDir, ig);
      if (!result || isEmptyResult(result)) continue;
      results.push(formatToolResult(call, result));
    }

    if (results.length === 0) return rawPrompt;

    const outputs = [];
    outputs.push(rawPrompt);
    outputs.push("Context from codebase:");
    outputs.push(results.join("\n\n"));

    return outputs.join("\n\n");
  }
}
