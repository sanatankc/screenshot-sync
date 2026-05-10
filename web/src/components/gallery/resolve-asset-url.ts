import { API_BASE_URL, toAssetUrl } from "@/lib/runtime";

export function resolveAssetUrl(storageKey: string | null, webSessionToken: string) {
  if (!storageKey) {
    return null;
  }

  return toAssetUrl(API_BASE_URL, storageKey, webSessionToken);
}
