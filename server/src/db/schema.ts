import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name"),
  activeDeviceId: text("active_device_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp_ms" }).notNull()
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  deviceTokenHash: text("device_token_hash").notNull(),
  platform: text("platform").notNull(),
  deviceName: text("device_name").notNull(),
  appVersion: text("app_version").notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" })
});

export const pairingSessions = sqliteTable("pairing_sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  pairingTokenHash: text("pairing_token_hash").notNull(),
  status: text("status").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  pairedAt: integer("paired_at", { mode: "timestamp_ms" }),
  viewerSessionId: text("viewer_session_id"),
  deviceId: text("device_id")
});

export const viewerSessions = sqliteTable("viewer_sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  sessionTokenHash: text("session_token_hash").notNull(),
  clientName: text("client_name"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" })
});

export const screenshots = sqliteTable("screenshots", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  deviceId: text("device_id").notNull(),
  clientGeneratedId: text("client_generated_id"),
  status: text("status").notNull(),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" }).notNull(),
  detectedAt: integer("detected_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  failedReason: text("failed_reason"),
  width: integer("width"),
  height: integer("height"),
  mimeType: text("mime_type"),
  fileSizeBytes: integer("file_size_bytes"),
  previewStorageKey: text("preview_storage_key"),
  previewMimeType: text("preview_mime_type"),
  previewSizeBytes: integer("preview_size_bytes"),
  previewWidth: integer("preview_width"),
  previewHeight: integer("preview_height"),
  blurhash: text("blurhash"),
  previewUploadedAt: integer("preview_uploaded_at", { mode: "timestamp_ms" }),
  originalStorageKey: text("original_storage_key"),
  originalMimeType: text("original_mime_type"),
  originalSizeBytes: integer("original_size_bytes"),
  originalUploadedAt: integer("original_uploaded_at", { mode: "timestamp_ms" }),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" })
});
