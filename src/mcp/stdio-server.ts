import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  PROMPTSCOUT_TOOL_NAME,
  type McpRequestDependencies,
  runPromptscoutTool,
} from "./protocol.js";

export class PromptscoutMcpStdioServer {
  private server: McpServer;

  constructor(private deps: McpRequestDependencies) {
    this.server = new McpServer({
      name: "promptscout-mcp",
      version: deps.serverVersion,
    });

    this.server.registerTool(
      PROMPTSCOUT_TOOL_NAME,
      {
        description:
          "Enrich a technical coding prompt with repository-aware context using promptscout's local LLM and search tools.",
        inputSchema: {
          prompt: z.string().describe("The user's technical request or prompt."),
          projectDir: z
            .string()
            .optional()
            .describe("Optional project root directory. Defaults to the MCP server working directory."),
        },
      },
      async ({ prompt, projectDir }) => runPromptscoutTool({ prompt, projectDir }, deps),
    );
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

