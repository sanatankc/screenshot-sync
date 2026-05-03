import type { Env } from "@server/lib/env";

export async function storeUpload(env: Env, storageKey: string, request: Request): Promise<void> {
  const body = await request.arrayBuffer();
  const contentType = request.headers.get("content-type") ?? undefined;

  await env.SCREENSHOT_ASSETS.put(storageKey, body, {
    httpMetadata: contentType ? { contentType } : undefined,
  });
}

export function getStorageKeyFromUploadPath(pathname: string): string | null {
  const prefix = "/internal/uploads/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const storageKey = pathname.slice(prefix.length);
  return storageKey.length > 0 ? storageKey : null;
}
