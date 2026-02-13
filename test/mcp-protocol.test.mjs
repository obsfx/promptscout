import test from "node:test";
import assert from "node:assert/strict";

import {
  extractContextSummary,
  PROMPTSCOUT_TOOL_NAME,
  runPromptscoutTool,
} from "../dist/mcp/protocol.js";

function parseToolPayload(result) {
  assert.ok(result);
  assert.ok(Array.isArray(result.content));
  const textBlock = result.content.find((item) => item.type === "text");
  assert.ok(textBlock);
  return JSON.parse(textBlock.text);
}

test("extractContextSummary counts promptscout context sections", () => {
  const improved = [
    "fix auth bug",
    "Context from codebase:",
    "",
    "<file_finder query=\"auth\">",
    "src/auth.ts",
    "src/auth.spec.ts",
    "</file_finder>",
    "",
    "<section_finder query=\"token\">",
    "src/auth.ts:18:const token = readToken()",
    "</section_finder>",
    "",
    "<definition_finder query=\"auth\">",
    "src/auth.ts:12:export function authenticate() {",
    "</definition_finder>",
    "",
    "<import_tracer query=\"auth\">",
    "src/server.ts:1:import { authenticate } from './auth'",
    "</import_tracer>",
    "",
    "<git_history query=\"auth\">",
    "abc1234 add auth module",
    "  src/auth.ts",
    "</git_history>",
  ].join("\n");

  const summary = extractContextSummary(improved);
  assert.deepEqual(summary, {
    files: 2,
    sections: 1,
    definitions: 1,
    imports: 1,
    commits: 1,
  });
});

test("runPromptscoutTool returns enriched payload and structured content", async () => {
  const improved = [
    "fix auth bug",
    "Context from codebase:",
    "",
    "<file_finder query=\"auth\">",
    "src/auth.ts",
    "</file_finder>",
  ].join("\n");

  const result = await runPromptscoutTool(
    {
      prompt: "fix auth bug",
      projectDir: "/repo",
    },
    {
      enrichPrompt: async () => improved,
      cwd: () => "/tmp/project",
      serverVersion: "1.0.0",
    },
  );

  assert.equal(result.isError, undefined);
  const payload = parseToolPayload(result);

  assert.equal(payload.tool, PROMPTSCOUT_TOOL_NAME);
  assert.equal(payload.prompt, "fix auth bug");
  assert.equal(payload.projectDir, "/repo");
  assert.equal(payload.hasContext, true);
  assert.equal(payload.summary.files, 1);
  assert.equal(payload.improved, improved);
  assert.deepEqual(result.structuredContent, payload);
});

test("runPromptscoutTool uses server cwd when projectDir is omitted", async () => {
  const improved = "fix auth bug";

  const result = await runPromptscoutTool(
    {
      prompt: "fix auth bug",
    },
    {
      enrichPrompt: async (_prompt, projectDir) => `${improved}:${projectDir}`,
      cwd: () => "/workspace",
      serverVersion: "1.0.0",
    },
  );

  const payload = parseToolPayload(result);
  assert.equal(payload.projectDir, "/workspace");
  assert.equal(payload.improved, "fix auth bug:/workspace");
});

test("runPromptscoutTool rejects empty prompt input", async () => {
  const result = await runPromptscoutTool(
    { prompt: "   " },
    {
      enrichPrompt: async () => "",
      cwd: () => "/tmp/project",
      serverVersion: "1.0.0",
    },
  );

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /must be a non-empty string/i);
});

test("runPromptscoutTool converts exceptions to tool errors", async () => {
  const result = await runPromptscoutTool(
    { prompt: "fix auth bug" },
    {
      enrichPrompt: async () => {
        throw new Error("model unavailable");
      },
      cwd: () => "/tmp/project",
      serverVersion: "1.0.0",
    },
  );

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /model unavailable/i);
});

