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
      mime_type TEXT,
      width INTEGER,
      height INTEGER,
      captured_at TEXT,
      detected_at TEXT NOT NULL,
      status TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      uploaded_at TEXT
    );
  `);

  ensureScreenshotQueueColumn("mime_type", "TEXT");
  ensureScreenshotQueueColumn("width", "INTEGER");
  ensureScreenshotQueueColumn("height", "INTEGER");
  ensureScreenshotQueueColumn("captured_at", "TEXT");

  database.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_screenshot_queue_uri
    ON screenshot_queue(uri);
  `);

  database.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_screenshot_queue_media_store_id
    ON screenshot_queue(media_store_id)
    WHERE media_store_id IS NOT NULL;
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS paired_device_session (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      workspace_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      device_token TEXT NOT NULL,
      server_url TEXT NOT NULL,
      connected_at TEXT NOT NULL,
      client_name TEXT
    );
  `);

  ensurePairedSessionColumn("client_name", "TEXT");

  database.execSync(`
    CREATE TABLE IF NOT EXISTS device_identity (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      value TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function ensurePairedSessionColumn(columnName: string, columnDefinition: string) {
  const existingColumns = database.getAllSync<{ name: string }>(`PRAGMA table_info(paired_device_session);`);
  const hasColumn = existingColumns.some((column) => column.name === columnName);

  if (!hasColumn) {
    database.execSync(`ALTER TABLE paired_device_session ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}

function ensureScreenshotQueueColumn(columnName: string, columnDefinition: string) {
  const existingColumns = database.getAllSync<{ name: string }>(`PRAGMA table_info(screenshot_queue);`);
  const hasColumn = existingColumns.some((column) => column.name === columnName);

  if (!hasColumn) {
    database.execSync(`ALTER TABLE screenshot_queue ADD COLUMN ${columnName} ${columnDefinition};`);
  }
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
