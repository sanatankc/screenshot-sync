import { useEffect, useMemo, useState } from "react";
import { ExternalLink, QrCode, Smartphone } from "lucide-react";
import {
  buildMobilePairingDeepLink,
  parsePairingValue,
} from "@screenshot-sync/contracts";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { PUBLIC_APP_CONFIG } from "@/lib/public-app-config";

type OpenStageProps = {
  rawUrl: string;
};

const APP_SCHEME = "captr";
const OPEN_ATTEMPT_DELAY_MS = 1800;

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

export function OpenStage({ rawUrl }: OpenStageProps) {
  const resolved = useMemo(() => parsePairingValue(rawUrl), [rawUrl]);
  const deepLink = useMemo(() => {
    if (!resolved) {
      return null;
    }

    return buildMobilePairingDeepLink(
      APP_SCHEME,
      resolved.payload,
      resolved.serverUrl ?? PUBLIC_APP_CONFIG.apiBaseUrl,
    );
  }, [resolved]);

  const ios = isIos();
  const android = isAndroid();
  const [attemptedOpen, setAttemptedOpen] = useState(false);
  const [showDownloadHint, setShowDownloadHint] = useState(false);

  useEffect(() => {
    if (ios || !deepLink) {
      return;
    }

    let settled = false;
    const fallback = window.setTimeout(() => {
      if (settled || document.hidden) {
        return;
      }

      setShowDownloadHint(true);
    }, OPEN_ATTEMPT_DELAY_MS);

    const settle = () => {
      settled = true;
      window.clearTimeout(fallback);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        settle();
      }
    };

    const onPageHide = () => settle();
    const onBlur = () => settle();

    setAttemptedOpen(true);
    window.location.href = deepLink;

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("blur", onBlur);

    return () => {
      window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("blur", onBlur);
    };
  }, [deepLink, ios]);

  const openApp = () => {
    if (!deepLink) {
      return;
    }

    setAttemptedOpen(true);
    window.location.href = deepLink;
  };

  const downloadApk = () => {
    window.location.href = PUBLIC_APP_CONFIG.androidApkDownloadUrl;
  };

  const heading = resolved
    ? `Open ${PUBLIC_APP_CONFIG.appName} to pair`
    : `Install ${PUBLIC_APP_CONFIG.appName} for Android`;

  const body = resolved
    ? `${PUBLIC_APP_CONFIG.appName} will connect this browser to your Android device. If the app is already installed, open it. If not, download the latest APK and scan again once it’s installed.`
    : `This link doesn’t include a valid pairing session anymore, but you can still install the latest Android build of ${PUBLIC_APP_CONFIG.appName}.`;

  return (
    <section className="relative flex min-h-screen w-full items-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.07),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,255,255,0.035),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_22%)]" />
      <BackgroundBeams className="opacity-10" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl rounded-[2rem] border border-white/[0.08] bg-black/28 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-10">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="Captr" className="size-12 shrink-0" />
            <div className="font-[var(--font-brand)] text-[28px] font-semibold tracking-[-0.07em] text-foreground">
              {PUBLIC_APP_CONFIG.appName}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h1 className="font-[var(--font-display)] text-[2.1rem] font-bold tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
              {heading}
            </h1>
            <p className="max-w-[42rem] text-pretty text-[1rem] leading-8 text-muted-foreground sm:text-[1.06rem]">
              {body}
            </p>
            {ios ? (
              <p className="text-sm leading-7 text-muted-foreground/90">
                iPhone won’t open Android installs directly here. Open this page on your Android phone to continue.
              </p>
            ) : attemptedOpen && showDownloadHint ? (
              <p className="text-sm leading-7 text-muted-foreground/90">
                {PUBLIC_APP_CONFIG.appName} didn’t open automatically. If it’s installed, tap
                {" "}
                <span className="text-foreground">Open {PUBLIC_APP_CONFIG.appName}</span>
                . Otherwise, download the APK first.
              </p>
            ) : attemptedOpen && android ? (
              <p className="text-sm leading-7 text-muted-foreground/90">
                Trying to open {PUBLIC_APP_CONFIG.appName}…
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-full bg-foreground px-6 text-background hover:bg-foreground/90"
              onClick={openApp}
              disabled={!deepLink || ios}
            >
              <Smartphone />
              Open {PUBLIC_APP_CONFIG.appName}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/[0.12] bg-white/[0.02] px-6 text-foreground hover:bg-white/[0.05]"
              onClick={downloadApk}
            >
              <ExternalLink />
              Download Android APK
            </Button>
          </div>

          {resolved ? (
            <div className="mt-8 rounded-[1.25rem] border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-start gap-3">
                <QrCode className="mt-0.5 size-5 text-foreground/80" />
                <div>
                  <p className="text-sm font-medium text-foreground">What happens next</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    If {PUBLIC_APP_CONFIG.appName} is already installed, it should open and pair this browser.
                    If it isn’t installed yet, download the APK, install it, and scan the QR again from the pairing page.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
