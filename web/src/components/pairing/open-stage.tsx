import { useEffect } from "react";
import { buildMobilePairingDeepLink, parsePairingValue } from "@screenshot-sync/contracts";
import { IosMessage } from "@/components/pairing/ios-message";
import { PUBLIC_APP_CONFIG } from "@/lib/public-app-config";

type OpenStageProps = {
  rawUrl: string;
};

const APP_SCHEME = "captr";
const FALLBACK_DELAY_MS = 1500;

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function OpenStage({ rawUrl }: OpenStageProps) {
  const resolved = parsePairingValue(rawUrl);
  const deepLink = resolved
    ? buildMobilePairingDeepLink(APP_SCHEME, resolved.payload, resolved.serverUrl)
    : null;

  const ios = isIos();

  useEffect(() => {
    if (ios) return;

    if (!deepLink) {
      window.location.replace(PUBLIC_APP_CONFIG.androidApkDownloadUrl);
      return;
    }

    // Try to open the app via deep link.
    window.location.href = deepLink;

    // If we're still here after a delay, the app isn't installed — go to download.
    const fallback = window.setTimeout(() => {
      if (!document.hidden) {
        window.location.replace(PUBLIC_APP_CONFIG.androidApkDownloadUrl);
      }
    }, FALLBACK_DELAY_MS);

    const onVisibilityChange = () => {
      if (document.hidden) {
        window.clearTimeout(fallback);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [deepLink, ios]);

  if (ios) return <IosMessage />;

  return null;
}
