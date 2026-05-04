import { desc, eq, inArray } from "drizzle-orm";
import { screenshots } from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { getDb } from "@server/lib/db";
import { publishScreenshotDeleted } from "@server/lib/workspace-hub";

const MIN_RECENT_SCREENSHOT_COUNT = 50;
const RECENT_WINDOW_MS = 60 * 60 * 1000;

export async function applyWorkspaceRetention(env: Env, workspaceId: string) {
  const db = getDb(env);
  const cutoff = Date.now() - RECENT_WINDOW_MS;

  const rows = await db.query.screenshots.findMany({
    where: eq(screenshots.workspaceId, workspaceId),
    orderBy: [desc(screenshots.createdAt)],
  });

  const protectedIds = new Set<string>();

  rows.forEach((row, index) => {
    if (index < MIN_RECENT_SCREENSHOT_COUNT || row.createdAt.getTime() >= cutoff) {
      protectedIds.add(row.id);
    }
  });

  const rowsToDelete = rows.filter((row) => !protectedIds.has(row.id));

  if (rowsToDelete.length === 0) {
    return [];
  }

  for (const row of rowsToDelete) {
    if (row.previewStorageKey) {
      await env.SCREENSHOT_ASSETS.delete(row.previewStorageKey);
    }

    if (row.originalStorageKey) {
      await env.SCREENSHOT_ASSETS.delete(row.originalStorageKey);
    }
  }

  await db.delete(screenshots).where(inArray(screenshots.id, rowsToDelete.map((row) => row.id)));

  await Promise.all(
    rowsToDelete.map((row) =>
      publishScreenshotDeleted(env, workspaceId, {
        type: "screenshot.deleted",
        workspaceId,
        screenshotId: row.id,
      }),
    ),
  );

  return rowsToDelete.map((row) => row.id);
}
