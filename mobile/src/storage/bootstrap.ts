import * as SQLite from "expo-sqlite";

const database = SQLite.openDatabaseSync("screenshot-sync.db");

export type BootstrapDiagnostics = {
  queueTableReady: boolean;
  databasePath: string;
  lastCheckedAt: string | null;
};

export async function ensureAppStorage() {
  database.execSync(`
    CREATE TABLE IF NOT EXISTS screenshot_queue (
      id TEXT PRIMARY KEY NOT NULL,
      media_store_id TEXT,
      uri TEXT NOT NULL,
      file_name TEXT NOT NULL,
      relative_path TEXT,
      detected_at TEXT NOT NULL,
      status TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      uploaded_at TEXT
    );
  `);
}

export async function loadBootstrapDiagnostics(): Promise<BootstrapDiagnostics> {
  const tableRow = database.getFirstSync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'screenshot_queue';"
  );

  return {
    queueTableReady: Boolean(tableRow?.name),
    databasePath: "screenshot-sync.db",
    lastCheckedAt: new Date().toISOString(),
  };
}
