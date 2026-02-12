import type { Command } from "commander";
import { existsSync } from "node:fs";
import { resolveModelFile } from "node-llama-cpp";
import {
  DATA_DIR,
  DB_PATH,
  MODEL_DIR,
  MODEL_HF_URI,
  MODEL_FILE_NAME,
  MODEL_DOWNLOAD_URI,
} from "../constants.js";
import { resolveModelDir } from "../utils/paths.js";

export function registerSetupCommand(program: Command): void {
  program
    .command("setup")
    .description("Initialize promptscout and download the model")
    .action(async () => {
      console.log(`Data directory: ${DATA_DIR}`);
      console.log(`Database:       ${DB_PATH}`);

      resolveModelDir();
      console.log(`Model directory: ${MODEL_DIR}`);
      console.log("");

      if (existsSync(MODEL_HF_URI)) {
        console.log(`Model already downloaded: ${MODEL_HF_URI}`);
        console.log("\nSetup complete.");
        return;
      }

      console.log("Downloading Ministral 3B Instruct (~2.1GB)...\n");

      try {
        await resolveModelFile(MODEL_DOWNLOAD_URI, {
          directory: MODEL_DIR,
          fileName: MODEL_FILE_NAME,
        });

        console.log(`\nModel saved to: ${MODEL_HF_URI}`);
      } catch (err) {
        console.error("\nFailed to download model.");
        if (err instanceof Error) {
          console.error(err.message);
        }
        process.exit(1);
      }

      console.log("\nSetup complete.");
    });
}
