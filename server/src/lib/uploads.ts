import type { Env } from "@server/lib/env";

function getStorageKeyFromPath(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const storageKey = pathname.slice(prefix.length);
  return storageKey.length > 0 ? storageKey : null;
}

export async function storeUpload(env: Env, storageKey: string, request: Request): Promise<void> {
  const body = await request.arrayBuffer();
  const contentType = request.headers.get("content-type") ?? undefined;

  await env.SCREENSHOT_ASSETS.put(storageKey, body, {
    httpMetadata: contentType ? { contentType } : undefined,
  });
}

export async function readUpload(env: Env, storageKey: string) {
  return env.SCREENSHOT_ASSETS.get(storageKey);
}

export function getStorageKeyFromUploadPath(pathname: string): string | null {
  return getStorageKeyFromPath(pathname, "/internal/uploads/");
}

export function getStorageKeyFromAssetPath(pathname: string): string | null {
  return getStorageKeyFromPath(pathname, "/api/assets/");
}
