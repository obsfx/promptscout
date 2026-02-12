import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { config } from "./schema.js";
import {
  MODEL_HF_URI,
  MODEL_HF_URI_KEY,
  MODEL_CONTEXT_SIZE_KEY,
  LLM_CONTEXT_SIZE,
} from "../constants.js";

export class ConfigRepo {
  constructor(private db: BetterSQLite3Database) {}

  get(key: string): string | undefined {
    const row = this.db
      .select()
      .from(config)
      .where(eq(config.key, key))
      .get();
    return row?.value;
  }

  set(key: string, value: string): void {
    this.db
      .insert(config)
      .values({ key, value })
      .onConflictDoUpdate({ target: config.key, set: { value } })
      .run();
  }

  delete(key: string): boolean {
    const result = this.db
      .delete(config)
      .where(eq(config.key, key))
      .run();
    return result.changes > 0;
  }

  getModelHfUri(): string {
    return this.get(MODEL_HF_URI_KEY) ?? MODEL_HF_URI;
  }

  getModelContextSize(): number {
    const val = this.get(MODEL_CONTEXT_SIZE_KEY);
    return val ? Number(val) : LLM_CONTEXT_SIZE;
  }

}
