import { beforeAll, beforeEach } from "vitest";
import { env } from "cloudflare:test";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    active_device_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_activity_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS workspaces_active_device_idx ON workspaces(active_device_id)`,
  `CREATE INDEX IF NOT EXISTS workspaces_last_activity_idx ON workspaces(last_activity_at)`,
  `CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    device_token_hash TEXT NOT NULL,
    platform TEXT NOT NULL,
    device_name TEXT NOT NULL,
    app_version TEXT NOT NULL,
    last_seen_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    revoked_at INTEGER
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS devices_token_hash_unique ON devices(device_token_hash)`,
  `CREATE INDEX IF NOT EXISTS devices_workspace_idx ON devices(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS devices_workspace_last_seen_idx ON devices(workspace_id, last_seen_at)`,
  `CREATE TABLE IF NOT EXISTS pairing_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    pairing_token_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    paired_at INTEGER,
    viewer_session_id TEXT,
    device_id TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS pairing_sessions_token_hash_unique ON pairing_sessions(pairing_token_hash)`,
  `CREATE INDEX IF NOT EXISTS pairing_sessions_workspace_idx ON pairing_sessions(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS pairing_sessions_expires_at_idx ON pairing_sessions(expires_at)`,
  `CREATE INDEX IF NOT EXISTS pairing_sessions_workspace_status_idx ON pairing_sessions(workspace_id, status)`,
  `CREATE TABLE IF NOT EXISTS viewer_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    session_token_hash TEXT NOT NULL,
    client_name TEXT,
    last_seen_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    revoked_at INTEGER
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS viewer_sessions_token_hash_unique ON viewer_sessions(session_token_hash)`,
  `CREATE INDEX IF NOT EXISTS viewer_sessions_workspace_idx ON viewer_sessions(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS viewer_sessions_workspace_last_seen_idx ON viewer_sessions(workspace_id, last_seen_at)`,
  `CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    client_generated_id TEXT,
    status TEXT NOT NULL,
    captured_at INTEGER NOT NULL,
    detected_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    failed_reason TEXT,
    width INTEGER,
    height INTEGER,
    mime_type TEXT,
    file_size_bytes INTEGER,
    preview_storage_key TEXT,
    preview_mime_type TEXT,
    preview_size_bytes INTEGER,
    preview_width INTEGER,
    preview_height INTEGER,
    blurhash TEXT,
    preview_uploaded_at INTEGER,
    original_storage_key TEXT,
    original_mime_type TEXT,
    original_size_bytes INTEGER,
    original_uploaded_at INTEGER,
    deleted_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS screenshots_workspace_created_at_idx ON screenshots(workspace_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS screenshots_workspace_detected_at_idx ON screenshots(workspace_id, detected_at)`,
  `CREATE INDEX IF NOT EXISTS screenshots_workspace_status_idx ON screenshots(workspace_id, status)`,
  `CREATE INDEX IF NOT EXISTS screenshots_device_created_at_idx ON screenshots(device_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS screenshots_device_client_generated_id_unique ON screenshots(device_id, client_generated_id)`,
];

beforeAll(async () => {
  for (const statement of schemaStatements) {
    await env.DB.prepare(statement).run();
  }
});

beforeEach(async () => {
  for (const table of ["screenshots", "pairing_sessions", "viewer_sessions", "devices", "workspaces"]) {
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  }
});
