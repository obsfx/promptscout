#!/usr/bin/env node

import { Command } from "commander";
import { getDrizzle } from "./storage/database.js";
import { HistoryRepo } from "./storage/history-repo.js";
import { ConfigRepo } from "./storage/config-repo.js";
import { Rewriter } from "./core/rewriter.js";
import { Orchestrator } from "./core/orchestrator.js";
import { HistoryService } from "./core/history-service.js";
import { registerSetupCommand } from "./commands/setup.js";
import { registerRewriteCommand } from "./commands/rewrite.js";
import { registerHistoryCommand } from "./commands/history.js";

const program = new Command();

program
  .name("promptscout")
  .description("Rewrite coding agent prompts using a local LLM")
  .version("1.0.0");

// 1. Database
const db = getDrizzle();

// 2. Repositories
const historyRepo = new HistoryRepo(db);
const configRepo = new ConfigRepo(db);

// 3. Services
const rewriter = new Rewriter(configRepo);
const orchestrator = new Orchestrator(historyRepo, rewriter);
const historyService = new HistoryService(historyRepo);

// 4. Commands
registerSetupCommand(program);
registerRewriteCommand(program, orchestrator);
registerHistoryCommand(program, historyService);

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error("An unexpected error occurred.");
    }
    process.exit(1);
  }
}

main();
