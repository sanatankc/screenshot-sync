import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { GallerySkeleton } from "@/components/gallery/gallery-skeleton";
import { ScreenshotTile } from "@/components/gallery/screenshot-tile";
import { copyImageToClipboard } from "@/components/gallery/copy-image-to-clipboard";
import { GalleryEmptyState } from "@/components/gallery/gallery-empty-state";
import { GalleryNavbar } from "@/components/gallery/gallery-navbar";
import { resolveAssetUrl } from "@/components/gallery/resolve-asset-url";
import { deleteScreenshot } from "@/lib/api";
import { API_BASE_URL } from "@/lib/runtime";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { GalleryStageProps } from "@/components/gallery/types";

export function GalleryStage({
  workspaceId,
  webSessionToken,
  screenshots,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  onReset,
}: GalleryStageProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => screenshots.some((item) => item.id === id)));
  }, [screenshots]);

  const selectedCount = selectedIds.length;
  const activeScreenshot = useMemo(
    () => screenshots.find((item) => item.id === selectedIds[0]) ?? null,
    [screenshots, selectedIds],
  );

  const handleSelect = (screenshotId: string, index: number, event: MouseEvent<HTMLElement>) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      setSelectedIds(screenshots.slice(start, end + 1).map((item) => item.id));
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      setSelectedIds((current) =>
        current.includes(screenshotId)
          ? current.filter((id) => id !== screenshotId)
          : [...current, screenshotId],
      );
      setLastSelectedIndex(index);
      return;
    }

    if (selectedIds.length === 1 && selectedIds[0] === screenshotId) {
      setSelectedIds([]);
      setLastSelectedIndex(null);
      return;
    }

    setSelectedIds([screenshotId]);
    setLastSelectedIndex(index);
  };

  const handleCopy = async (screenshot = activeScreenshot) => {
    if (!screenshot) {
      return;
    }

    const assetUrl = resolveAssetUrl(
      screenshot.originalStorageKey ?? screenshot.previewStorageKey,
      webSessionToken,
    );

    if (!assetUrl) {
      return;
    }

    setCopyingId(screenshot.id);
    try {
      await copyImageToClipboard(assetUrl);
    } finally {
      window.setTimeout(() => setCopyingId((current) => (current === screenshot.id ? null : current)), 450);
    }
  };


  const requestDelete = (ids: string[]) => {
    setDeleteError(null);
    setPendingDeleteIds(ids);
  };

  const confirmDelete = async () => {
    if (pendingDeleteIds.length === 0) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await Promise.all(pendingDeleteIds.map((id) => deleteScreenshot(API_BASE_URL, webSessionToken, id)));
      setSelectedIds((current) => current.filter((id) => !pendingDeleteIds.includes(id)));
      setPendingDeleteIds([]);
      onRefresh();
    } catch {
      setDeleteError("Could not delete screenshot(s).");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <GallerySkeleton />;
  }

  return (
    <section className="flex min-h-screen w-full min-w-0 flex-1 flex-col bg-background text-foreground">
      <GalleryNavbar
        selectedCount={selectedCount}
        canCopySelection={Boolean(activeScreenshot)}
        onCopySelection={() => {
          void handleCopy();
        }}
        onDeleteSelection={() => requestDelete(selectedIds)}
        onDisconnect={onReset}
      />

      <div className="flex-1 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.075)_0.9px,transparent_1px)] [background-size:16px_16px]">
        {error || deleteError ? (
        <div className="border-b border-destructive/40 bg-destructive/10 px-5 py-3 text-sm text-destructive">
          {deleteError ?? error}
        </div>
      ) : null}

        {screenshots.length === 0 ? (
        <GalleryEmptyState workspaceId={workspaceId} />
      ) : (
        <div className="grid border-bs-gray-800 w-full grid-cols-2 gap-6 p-12 sm:grid-cols-3 xl:grid-cols-5">
          {screenshots.map((screenshot, index) => {
            const isSelected = selectedIds.includes(screenshot.id);

            return (
              <div key={screenshot.id} className="overflow-hidden border border-border">
                <ScreenshotTile
                  screenshot={screenshot}
                  webSessionToken={webSessionToken}
                  isSelected={isSelected}
                  isCopying={copyingId === screenshot.id}
                  onSelect={(event) => handleSelect(screenshot.id, index, event)}
                  onCopy={() => void handleCopy(screenshot)}
                  onDelete={() => requestDelete([screenshot.id])}
                />
              </div>
            );
          })}
        </div>
        )}
      </div>
      <AlertDialog open={pendingDeleteIds.length > 0} onOpenChange={(open) => {
        if (!open && !isDeleting) {
          setPendingDeleteIds([]);
          setDeleteError(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteIds.length > 1 ? `Delete ${pendingDeleteIds.length} screenshots?` : "Delete screenshot?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteIds.length > 1
                ? "These screenshots will be removed from the gallery and their stored assets will be deleted. This action can’t be undone."
                : "This screenshot will be removed from the gallery and its stored assets will be deleted. This action can’t be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : pendingDeleteIds.length > 1 ? "Delete screenshots" : "Delete screenshot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
