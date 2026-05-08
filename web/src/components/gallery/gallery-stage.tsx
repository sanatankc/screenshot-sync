import { ImageIcon, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { ScreenshotRecord } from "@screenshot-sync/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, toAssetUrl } from "@/lib/runtime";

type GalleryStageProps = {
  workspaceId: string;
  webSessionToken: string;
  connectionState: "idle" | "connecting" | "open" | "closed" | "error";
  screenshots: ScreenshotRecord[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  pairedDeviceName: string | null;
  onRefresh: () => void;
  onReset: () => void;
};

function getConnectionLabel(state: GalleryStageProps["connectionState"]) {
  if (state === "open") return "live";
  if (state === "connecting") return "syncing";
  if (state === "closed") return "reconnecting";
  if (state === "error") return "offline";
  return "ready";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

function resolveImageUrl(screenshot: ScreenshotRecord, webSessionToken: string) {
  const storageKey = screenshot.previewStorageKey ?? screenshot.originalStorageKey;
  if (!storageKey) {
    return null;
  }

  return toAssetUrl(API_BASE_URL, storageKey, webSessionToken);
}

function ScreenshotCard({ screenshot, webSessionToken }: { screenshot: ScreenshotRecord; webSessionToken: string }) {
  const imageUrl = resolveImageUrl(screenshot, webSessionToken);
  const aspectRatio = screenshot.width && screenshot.height ? `${screenshot.width} / ${screenshot.height}` : undefined;

  return (
    <article className="group animate-in fade-in zoom-in-95 duration-300">
      <Card className="overflow-hidden border-border/70 bg-card/92 shadow-xl shadow-black/10 transition-transform duration-300 group-hover:-translate-y-1">
        <div className="relative border-b border-border/60 bg-background/70" style={aspectRatio ? { aspectRatio } : { aspectRatio: "9 / 16" }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Screenshot ${screenshot.id}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_46%)]">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="rounded-full border border-border/70 bg-card/80 p-3">
                  <ImageIcon className="size-5" />
                </div>
                <div className="text-[11px] uppercase tracking-[0.24em]">{screenshot.status.replace("_", " ")}</div>
              </div>
            </div>
          )}

          {screenshot.status !== "ready" && (
            <div className="absolute inset-x-4 bottom-4 rounded-full border border-border/70 bg-background/75 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-sm">
              {screenshot.status.replace("_", " ")}
            </div>
          )}
        </div>

        <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{formatTimestamp(screenshot.capturedAt)}</div>
            <div className="truncate text-xs text-muted-foreground">{screenshot.id.slice(0, 12)}</div>
          </div>
          <Badge variant="secondary" className="rounded-full bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
            {screenshot.status}
          </Badge>
        </CardContent>
      </Card>
    </article>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="overflow-hidden border-border/70 bg-card/92">
          <Skeleton className="aspect-[9/16] w-full" />
          <div className="space-y-3 px-4 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function GalleryStage({
  workspaceId,
  webSessionToken,
  connectionState,
  screenshots,
  isLoading,
  isRefreshing,
  error,
  pairedDeviceName,
  onRefresh,
  onReset,
}: GalleryStageProps) {
  return (
    <section className="flex w-full flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
            Screenshot Sync
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-5xl tracking-tight text-foreground sm:text-6xl">
              Screens flowing live.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              {pairedDeviceName ? `${pairedDeviceName} is connected.` : "Your phone is connected."} New captures appear here automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-border/70 bg-card/80 px-3 py-2 text-[10px] uppercase tracking-[0.18em]">
            {connectionState === "open" ? <Wifi className="mr-1 size-3.5" /> : <WifiOff className="mr-1 size-3.5" />}
            {getConnectionLabel(connectionState)}
          </Badge>
          <Badge variant="secondary" className="rounded-full border border-border/70 bg-card/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em]">
            {workspaceId.slice(0, 12)}
          </Badge>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={onRefresh}>
            <RefreshCw data-icon="inline-start" className={isRefreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onReset}>
            New viewer
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 text-destructive-foreground">
          <CardContent className="px-5 py-4 text-sm">Could not load screenshots right now.</CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <GallerySkeleton />
      ) : screenshots.length === 0 ? (
        <Card className="border-border/70 bg-card/92 shadow-xl shadow-black/10">
          <CardHeader className="pb-3">
            <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Workspace ready</div>
          </CardHeader>
          <CardContent className="space-y-2 pb-6">
            <h2 className="font-serif text-3xl text-foreground">Waiting for the first screenshot.</h2>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              Keep the phone nearby and take a screenshot there. We&apos;ll place it here as soon as the upload starts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {screenshots.map((screenshot) => (
            <ScreenshotCard key={screenshot.id} screenshot={screenshot} webSessionToken={webSessionToken} />
          ))}
        </div>
      )}
    </section>
  );
}
