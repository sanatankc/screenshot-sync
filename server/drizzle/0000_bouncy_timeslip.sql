CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`device_token_hash` text NOT NULL,
	`platform` text NOT NULL,
	`device_name` text NOT NULL,
	`app_version` text NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_token_hash_unique` ON `devices` (`device_token_hash`);--> statement-breakpoint
CREATE INDEX `devices_workspace_idx` ON `devices` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `devices_workspace_last_seen_idx` ON `devices` (`workspace_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `pairing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`pairing_token_hash` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`paired_at` integer,
	`viewer_session_id` text,
	`device_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pairing_sessions_token_hash_unique` ON `pairing_sessions` (`pairing_token_hash`);--> statement-breakpoint
CREATE INDEX `pairing_sessions_workspace_idx` ON `pairing_sessions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `pairing_sessions_expires_at_idx` ON `pairing_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `pairing_sessions_workspace_status_idx` ON `pairing_sessions` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`device_id` text NOT NULL,
	`client_generated_id` text,
	`status` text NOT NULL,
	`captured_at` integer NOT NULL,
	`detected_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`failed_reason` text,
	`width` integer,
	`height` integer,
	`mime_type` text,
	`file_size_bytes` integer,
	`preview_storage_key` text,
	`preview_mime_type` text,
	`preview_size_bytes` integer,
	`preview_width` integer,
	`preview_height` integer,
	`blurhash` text,
	`preview_uploaded_at` integer,
	`original_storage_key` text,
	`original_mime_type` text,
	`original_size_bytes` integer,
	`original_uploaded_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `screenshots_workspace_created_at_idx` ON `screenshots` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `screenshots_workspace_detected_at_idx` ON `screenshots` (`workspace_id`,`detected_at`);--> statement-breakpoint
CREATE INDEX `screenshots_workspace_status_idx` ON `screenshots` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `screenshots_device_created_at_idx` ON `screenshots` (`device_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `screenshots_device_client_generated_id_unique` ON `screenshots` (`device_id`,`client_generated_id`);--> statement-breakpoint
CREATE TABLE `viewer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`session_token_hash` text NOT NULL,
	`client_name` text,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `viewer_sessions_token_hash_unique` ON `viewer_sessions` (`session_token_hash`);--> statement-breakpoint
CREATE INDEX `viewer_sessions_workspace_idx` ON `viewer_sessions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `viewer_sessions_workspace_last_seen_idx` ON `viewer_sessions` (`workspace_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`active_device_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspaces_active_device_idx` ON `workspaces` (`active_device_id`);--> statement-breakpoint
CREATE INDEX `workspaces_last_activity_idx` ON `workspaces` (`last_activity_at`);