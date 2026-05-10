import { useEffect, useState, type MouseEvent } from "react";
import { Copy, ImageIcon, Trash2 } from "lucide-react";
import type { ScreenshotRecord } from "@screenshot-sync/contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TILE_ASPECT_RATIO } from "@/components/gallery/constants";
import { resolveAssetUrl } from "@/components/gallery/resolve-asset-url";

type ScreenshotTileProps = {
  screenshot: ScreenshotRecord;
  webSessionToken: string;
  isSelected: boolean;
  isCopying: boolean;
  onSelect: (event: MouseEvent<HTMLElement>) => void;
  onCopy: () => void;
  onDelete: () => void;
};

export function ScreenshotTile({
  screenshot,
  webSessionToken,
  isSelected,
  isCopying,
  onSelect,
  onCopy,
  onDelete,
}: ScreenshotTileProps) {
  const previewUrl = resolveAssetUrl(screenshot.previewStorageKey, webSessionToken);
  const originalUrl = resolveAssetUrl(screenshot.originalStorageKey, webSessionToken);
  const [originalLoaded, setOriginalLoaded] = useState(false);

  useEffect(() => {
    setOriginalLoaded(false);
  }, [originalUrl]);

  const shouldShowOriginal = screenshot.status === "ready" && Boolean(originalUrl);
  const fallbackUrl = previewUrl ?? originalUrl;

  return (
    <article
      className={cn("group relative overflow-hidden bg-card/40", isSelected && "z-10")}
      onClick={onSelect}
    >
      <div className="relative w-full bg-background" style={{ aspectRatio: TILE_ASPECT_RATIO }}>
        {fallbackUrl ? (
          <div className="relative h-full w-full overflow-hidden bg-background">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 h-full w-full scale-[1.03] object-cover transition-all duration-700",
                  shouldShowOriginal
                    ? originalLoaded
                      ? "opacity-0 blur-none"
                      : "opacity-100 blur-xl saturate-75"
                    : "opacity-100 blur-md saturate-90",
                )}
                loading="lazy"
              />
            ) : null}

            {(shouldShowOriginal ? originalUrl : !previewUrl ? originalUrl : null) ? (
              <img
                src={(shouldShowOriginal ? originalUrl : originalUrl)!}
                alt={`Screenshot ${screenshot.id}`}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-all duration-700",
                  shouldShowOriginal
                    ? originalLoaded
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-[1.015]"
                    : "opacity-100",
                )}
                loading="lazy"
                onLoad={() => {
                  if (shouldShowOriginal) {
                    setOriginalLoaded(true);
                  }
                }}
              />
            ) : null}

            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_62%,color-mix(in_oklab,var(--color-background)_90%,transparent)_100%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                isSelected && "hidden",
              )}
            />

            <div
              className={cn(
                "pointer-events-none absolute inset-0 border-2 border-transparent bg-transparent transition-all duration-150",
                isSelected && "border-[#3b82f6] bg-[rgba(59,130,246,0.18)] shadow-[inset_0_0_0_1px_rgba(191,219,254,0.35)]",
              )}
            />

            <div
              className={cn(
                "absolute inset-x-0 bottom-0 flex translate-y-3 items-center border-t border-border bg-background/96 px-0 py-0 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100",
                isSelected && "hidden",
              )}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 rounded-none border-0 border-r border-border bg-background/30 px-2 text-[11px] uppercase tracking-[0.18em] text-foreground hover:bg-accent/60"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopy();
                }}
              >
                <Copy data-icon="inline-start" className={isCopying ? "animate-pulse" : undefined} />
                {isCopying ? "Copying" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 rounded-none border-0 bg-transparent px-2 text-[11px] uppercase tracking-[0.18em] text-red-200/80 shadow-none hover:border-transparent hover:bg-red-500/10 hover:text-red-100 focus-visible:border-red-400/40 focus-visible:bg-red-500/10"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </div>

          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent_42%)]">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="rounded-full border border-border/70 bg-card/80 p-3">
                <ImageIcon className="size-5" />
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
