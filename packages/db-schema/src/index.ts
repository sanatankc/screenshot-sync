import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export type DevicePlatform = "android";
export type PairingSessionStatus = "pending" | "paired" | "expired" | "cancelled";
export type ScreenshotStatus = "pending" | "preview_ready" | "ready" | "failed" | "deleted";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name"),
  activeDeviceId: text("active_device_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => ({
  activeDeviceIndex: index("workspaces_active_device_idx").on(table.activeDeviceId),
  lastActivityIndex: index("workspaces_last_activity_idx").on(table.lastActivityAt),
}));

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  deviceIdentityHash: text("device_identity_hash").notNull(),
  deviceTokenHash: text("device_token_hash").notNull(),
  platform: text("platform").$type<DevicePlatform>().notNull(),
  deviceName: text("device_name").notNull(),
  appVersion: text("app_version").notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
}, (table) => ({
  deviceIdentityHashUnique: uniqueIndex("devices_identity_hash_unique").on(table.deviceIdentityHash),
  deviceTokenHashUnique: uniqueIndex("devices_token_hash_unique").on(table.deviceTokenHash),
  workspaceIndex: index("devices_workspace_idx").on(table.workspaceId),
  workspaceLastSeenIndex: index("devices_workspace_last_seen_idx").on(table.workspaceId, table.lastSeenAt),
}));

export const pairingSessions = sqliteTable("pairing_sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  pairingTokenHash: text("pairing_token_hash").notNull(),
  status: text("status").$type<PairingSessionStatus>().notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  pairedAt: integer("paired_at", { mode: "timestamp_ms" }),
  viewerSessionId: text("viewer_session_id"),
  deviceId: text("device_id"),
}, (table) => ({
  pairingTokenHashUnique: uniqueIndex("pairing_sessions_token_hash_unique").on(table.pairingTokenHash),
  workspaceIndex: index("pairing_sessions_workspace_idx").on(table.workspaceId),
  expiresAtIndex: index("pairing_sessions_expires_at_idx").on(table.expiresAt),
  workspaceStatusIndex: index("pairing_sessions_workspace_status_idx").on(table.workspaceId, table.status),
}));

export const viewerSessions = sqliteTable("viewer_sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  sessionTokenHash: text("session_token_hash").notNull(),
  clientName: text("client_name"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
}, (table) => ({
  sessionTokenHashUnique: uniqueIndex("viewer_sessions_token_hash_unique").on(table.sessionTokenHash),
  workspaceIndex: index("viewer_sessions_workspace_idx").on(table.workspaceId),
  workspaceLastSeenIndex: index("viewer_sessions_workspace_last_seen_idx").on(table.workspaceId, table.lastSeenAt),
}));

export const screenshots = sqliteTable("screenshots", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  deviceId: text("device_id").notNull(),
  clientGeneratedId: text("client_generated_id"),
  status: text("status").$type<ScreenshotStatus>().notNull(),
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
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
}, (table) => ({
  workspaceCreatedAtIndex: index("screenshots_workspace_created_at_idx").on(table.workspaceId, table.createdAt),
  workspaceDetectedAtIndex: index("screenshots_workspace_detected_at_idx").on(table.workspaceId, table.detectedAt),
  workspaceStatusIndex: index("screenshots_workspace_status_idx").on(table.workspaceId, table.status),
  deviceCreatedAtIndex: index("screenshots_device_created_at_idx").on(table.deviceId, table.createdAt),
  deviceClientGeneratedIdUnique: uniqueIndex("screenshots_device_client_generated_id_unique").on(
    table.deviceId,
    table.clientGeneratedId,
  ),
}));

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type NewWorkspaceRow = typeof workspaces.$inferInsert;
export type DeviceRow = typeof devices.$inferSelect;
export type NewDeviceRow = typeof devices.$inferInsert;
export type PairingSessionRow = typeof pairingSessions.$inferSelect;
export type NewPairingSessionRow = typeof pairingSessions.$inferInsert;
export type ViewerSessionRow = typeof viewerSessions.$inferSelect;
export type NewViewerSessionRow = typeof viewerSessions.$inferInsert;
export type ScreenshotRow = typeof screenshots.$inferSelect;
export type NewScreenshotRow = typeof screenshots.$inferInsert;
