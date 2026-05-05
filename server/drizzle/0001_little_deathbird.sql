PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pairing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`pairing_token_hash` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`paired_at` integer,
	`viewer_session_id` text,
	`device_id` text
);
--> statement-breakpoint
INSERT INTO `__new_pairing_sessions`("id", "workspace_id", "pairing_token_hash", "status", "expires_at", "created_at", "paired_at", "viewer_session_id", "device_id") SELECT "id", "workspace_id", "pairing_token_hash", "status", "expires_at", "created_at", "paired_at", "viewer_session_id", "device_id" FROM `pairing_sessions`;--> statement-breakpoint
DROP TABLE `pairing_sessions`;--> statement-breakpoint
ALTER TABLE `__new_pairing_sessions` RENAME TO `pairing_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `pairing_sessions_token_hash_unique` ON `pairing_sessions` (`pairing_token_hash`);--> statement-breakpoint
CREATE INDEX `pairing_sessions_workspace_idx` ON `pairing_sessions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `pairing_sessions_expires_at_idx` ON `pairing_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `pairing_sessions_workspace_status_idx` ON `pairing_sessions` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_viewer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`session_token_hash` text NOT NULL,
	`client_name` text,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_viewer_sessions`("id", "workspace_id", "session_token_hash", "client_name", "last_seen_at", "created_at", "expires_at", "revoked_at") SELECT "id", "workspace_id", "session_token_hash", "client_name", "last_seen_at", "created_at", "expires_at", "revoked_at" FROM `viewer_sessions`;--> statement-breakpoint
DROP TABLE `viewer_sessions`;--> statement-breakpoint
ALTER TABLE `__new_viewer_sessions` RENAME TO `viewer_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `viewer_sessions_token_hash_unique` ON `viewer_sessions` (`session_token_hash`);--> statement-breakpoint
CREATE INDEX `viewer_sessions_workspace_idx` ON `viewer_sessions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `viewer_sessions_workspace_last_seen_idx` ON `viewer_sessions` (`workspace_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `__new_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`device_identity_hash` text NOT NULL,
	`device_token_hash` text NOT NULL,
	`platform` text NOT NULL,
	`device_name` text NOT NULL,
	`app_version` text NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_devices`("id", "workspace_id", "device_identity_hash", "device_token_hash", "platform", "device_name", "app_version", "last_seen_at", "created_at", "revoked_at")
SELECT "id", "workspace_id", COALESCE("device_token_hash", "id"), "device_token_hash", "platform", "device_name", "app_version", "last_seen_at", "created_at", "revoked_at"
FROM `devices`;--> statement-breakpoint
DROP TABLE `devices`;--> statement-breakpoint
ALTER TABLE `__new_devices` RENAME TO `devices`;--> statement-breakpoint
CREATE UNIQUE INDEX `devices_identity_hash_unique` ON `devices` (`device_identity_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_token_hash_unique` ON `devices` (`device_token_hash`);--> statement-breakpoint
CREATE INDEX `devices_workspace_idx` ON `devices` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `devices_workspace_last_seen_idx` ON `devices` (`workspace_id`,`last_seen_at`);
