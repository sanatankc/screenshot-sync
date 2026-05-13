import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { buildPairingOpenUrl, type PairingSessionCreateResponse } from "@screenshot-sync/contracts";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurText } from "@/components/pairing/blur-text";
import { PUBLIC_APP_CONFIG } from "@/lib/public-app-config";
import { API_BASE_URL } from "@/lib/runtime";
import { SplitText } from "@/components/pairing/split-text";
import { cn } from "@/lib/utils";

type PairingStageProps = {
  phase: "booting" | "waiting" | "paired" | "error";
  connectionState: "idle" | "connecting" | "open" | "closed" | "error";
  session: PairingSessionCreateResponse | null;
  workspaceId: string | null;
  pairedDeviceName: string | null;
  error: string | null;
  clientName: string;
  onClientNameChange: (value: string) => void;
  onRefresh: () => void;
};

const DEFAULT_QR_COLORS = {
  background: "#171717",
  foreground: "#ece4d8",
};

export function PairingStage({
  phase,
  connectionState,
  session,
  workspaceId,
  pairedDeviceName,
  error,
  clientName,
  onClientNameChange,
  onRefresh,
}: PairingStageProps) {
  const qrValue = session ? buildPairingOpenUrl(PUBLIC_APP_CONFIG.openUrlBase, session.qrPayload, API_BASE_URL) : null;
  const [colors, setColors] = useState(DEFAULT_QR_COLORS);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const background = styles.getPropertyValue("--background").trim() || DEFAULT_QR_COLORS.background;
    const foreground = styles.getPropertyValue("--foreground").trim() || DEFAULT_QR_COLORS.foreground;
    setColors({ background, foreground });
  }, []);


  return (
    <section className="relative flex min-h-screen w-full items-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.07),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,255,255,0.035),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_22%)]" />
      <BackgroundBeams className="opacity-20" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.18),transparent_36%,transparent_64%,rgba(0,0,0,0.12))]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[84rem] items-center gap-10 px-4 py-16 lg:grid-cols-[minmax(0,42rem)_minmax(24rem,30rem)] lg:justify-between lg:gap-20 lg:px-6 xl:gap-24 xl:px-8">
        <div className="flex min-w-0 max-w-[42rem] flex-col items-start justify-center gap-6">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="Captr" className="size-12 shrink-0" />
            <div className="font-[var(--font-brand)] text-[28px] font-semibold tracking-[-0.07em] text-foreground">
              {PUBLIC_APP_CONFIG.appName}
            </div>
          </div>

          <SplitText
            tag="h1"
            text="Stop sharing screenshots."
            splitType="words"
            delay={65}
            duration={0.78}
            className="max-w-[42rem] font-[var(--font-display)] text-[2.35rem] font-extrabold leading-[0.98] tracking-[-0.02em] text-foreground sm:whitespace-nowrap sm:text-[2.85rem] lg:text-[3.2rem]"
            from={{ opacity: 0, y: 42, rotateX: -42 }}
            to={{ opacity: 1, y: 0, rotateX: 0 }}
          />

          <div className="max-w-[42rem] space-y-4">
            <BlurText
              text={`Seriously, stop. You don't need to anymore. ${PUBLIC_APP_CONFIG.appName} is built for people who keep taking screenshots on Android and later need them on desktop. Every screenshot you take from now on is automatically synced.`}
              className="text-pretty text-[1rem] leading-8 text-muted-foreground sm:text-[1.06rem]"
              delay={0.45}
            />
            <BlurText
              text={`Scan this code to pair the app, or use it to download ${PUBLIC_APP_CONFIG.appName} first if it isn't installed yet.`}
              className="text-pretty text-[1rem] leading-8 text-muted-foreground sm:text-[1.06rem]"
              delay={0.62}
            />
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-self-end">
          <div className="relative w-full max-w-[30rem] lg:w-[30rem]">
            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_52%)] blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/[0.08] bg-black/28 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
              <div className="rounded-[1.55rem] border border-white/[0.08] bg-black/26 p-4 sm:p-5">
                <div className="aspect-square w-full overflow-hidden rounded-[1.2rem] border border-white/[0.06] bg-[rgba(255,255,255,0.015)]">
                  {qrValue ? (
                    <div className="flex h-full items-center justify-center p-6 sm:p-8">
                      <QRCodeSVG
                        value={qrValue}
                        size={320}
                        bgColor={colors.background}
                        fgColor={colors.foreground}
                        marginSize={2}
                        className="h-full w-full"
                      />
                    </div>
                  ) : workspaceId ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                      <p className="font-[var(--font-brand)] text-2xl tracking-[-0.05em] text-foreground">
                        Already paired
                      </p>
                      <p className="max-w-[18rem] text-sm leading-6 text-muted-foreground">
                        This viewer is already attached to your phone workspace.
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 sm:p-8">
                      <Skeleton className="h-full w-full rounded-[1rem] bg-white/[0.05]" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4">
                <label className="sr-only" htmlFor="pairing-client-name">Viewer name</label>
                <input
                  id="pairing-client-name"
                  type="text"
                  value={clientName}
                  onChange={(event) => onClientNameChange(event.target.value)}
                  placeholder="Viewer name"
                  className={cn(
                    "h-10 min-w-0 flex-1 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-white/[0.16] focus:bg-white/[0.04]",
                    error && "border-red-300/20"
                  )}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-full border-white/[0.08] bg-white/[0.02] px-4 text-[11px] uppercase tracking-[0.18em] text-foreground hover:bg-white/[0.05]"
                  onClick={onRefresh}
                >
                  <RefreshCw data-icon="inline-start" className={phase === "booting" ? "animate-spin" : undefined} />
                  New code
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
