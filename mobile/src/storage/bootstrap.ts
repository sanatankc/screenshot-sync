import * as SQLite from "expo-sqlite";

export const database = SQLite.openDatabaseSync("screenshot-sync.db");

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

  database.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_screenshot_queue_uri
    ON screenshot_queue(uri);
  `);

  database.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_screenshot_queue_media_store_id
    ON screenshot_queue(media_store_id)
    WHERE media_store_id IS NOT NULL;
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
