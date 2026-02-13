import type { Command } from "commander";
import type { Rewriter } from "../core/rewriter.js";
import { PromptscoutMcpStdioServer } from "../mcp/stdio-server.js";

export function registerMcpServerCommand(
  program: Command,
  rewriter: Rewriter,
): void {
  program
    .command("mcp-server")
    .description("Run promptscout as an MCP server over stdio")
    .option("--project-dir <dir>", "Default project root used for MCP tool calls")
    .action(async (opts: Record<string, unknown>) => {
      const defaultProjectDir = typeof opts.projectDir === "string" && opts.projectDir.trim()
        ? opts.projectDir
        : process.cwd();

      const server = new PromptscoutMcpStdioServer({
        serverVersion: program.version() ?? "0.0.0",
        cwd: () => defaultProjectDir,
        enrichPrompt: async (prompt: string, projectDir: string) => {
          return rewriter.rewrite(prompt, projectDir);
        },
      });

      await server.start();
    });
}
