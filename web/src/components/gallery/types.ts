import type { ScreenshotRecord } from "@screenshot-sync/contracts";

export type GalleryStageProps = {
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
