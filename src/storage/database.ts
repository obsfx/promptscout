import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { resolveDbPath } from "../utils/paths.js";

let db: Database.Database | null = null;
let drizzleDb: BetterSQLite3Database | null = null;

function migrate(database: Database.Database): void {
  const version = database.pragma("user_version", { simple: true }) as number;

  if (version < 1) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directory TEXT NOT NULL,
        raw_input TEXT NOT NULL,
        improved_output TEXT NOT NULL,
        final_output TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  }

  if (version < 2) {
    database.exec(`
      ALTER TABLE history ADD COLUMN model_name TEXT;
      PRAGMA user_version = 2;
    `);
  }
}

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = resolveDbPath();
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

export function getDrizzle(): BetterSQLite3Database {
  if (drizzleDb) return drizzleDb;
  const sqlite = getDatabase();
  drizzleDb = drizzle({ client: sqlite });
  return drizzleDb;
}
