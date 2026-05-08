import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ScreenshotCreatedEvent,
  ScreenshotDeletedEvent,
  ScreenshotListResponse,
  ScreenshotRecord,
  ScreenshotUpdatedEvent,
  WorkspaceEvent,
} from "@screenshot-sync/contracts";
import { listScreenshots } from "@/lib/api";
import { API_BASE_URL, toWorkspaceWebSocketUrl } from "@/lib/runtime";

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

const RECONNECT_DELAY_MS = 1_500;
const STALE_TIME_MS = 60_000;

function screenshotsKey(workspaceId: string) {
  return ["screenshots", workspaceId] as const;
}

function sortScreenshots(items: ScreenshotRecord[]) {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function upsertScreenshot(items: ScreenshotRecord[], screenshot: ScreenshotRecord) {
  const withoutExisting = items.filter((item) => item.id !== screenshot.id);
  return sortScreenshots([screenshot, ...withoutExisting]);
}

export function useWorkspaceGallery(workspaceId: string | null, webSessionToken: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");

  const screenshotsQuery = useQuery({
    queryKey: workspaceId ? screenshotsKey(workspaceId) : ["screenshots", "inactive"],
    queryFn: async () => {
      if (!workspaceId || !webSessionToken) {
        return { items: [], nextCursor: null } satisfies ScreenshotListResponse;
      }

      return listScreenshots(API_BASE_URL, webSessionToken, 100);
    },
    enabled: Boolean(workspaceId && webSessionToken),
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!workspaceId || !webSessionToken) {
      setConnectionState("idle");
      socketRef.current?.close();
      socketRef.current = null;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }

      setConnectionState("connecting");
      const socket = new WebSocket(toWorkspaceWebSocketUrl(API_BASE_URL, workspaceId, webSessionToken));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (cancelled) {
          return;
        }

        setConnectionState("open");
        void queryClient.invalidateQueries({ queryKey: screenshotsKey(workspaceId) });
      });

      socket.addEventListener("message", (event) => {
        const payload = JSON.parse(String(event.data)) as WorkspaceEvent;

        if (payload.type === "screenshot.created") {
          const createdEvent = payload as ScreenshotCreatedEvent;
          queryClient.setQueryData<ScreenshotListResponse>(screenshotsKey(workspaceId), (current) => ({
            items: upsertScreenshot(current?.items ?? [], createdEvent.screenshot),
            nextCursor: current?.nextCursor ?? null,
          }));
          return;
        }

        if (payload.type === "screenshot.updated") {
          const updatedEvent = payload as ScreenshotUpdatedEvent;
          queryClient.setQueryData<ScreenshotListResponse>(screenshotsKey(workspaceId), (current) => ({
            items: upsertScreenshot(current?.items ?? [], updatedEvent.screenshot),
            nextCursor: current?.nextCursor ?? null,
          }));
          return;
        }

        if (payload.type === "screenshot.deleted") {
          const deletedEvent = payload as ScreenshotDeletedEvent;
          queryClient.setQueryData<ScreenshotListResponse>(screenshotsKey(workspaceId), (current) => ({
            items: (current?.items ?? []).filter((item) => item.id !== deletedEvent.screenshotId),
            nextCursor: current?.nextCursor ?? null,
          }));
        }
      });

      socket.addEventListener("close", () => {
        if (cancelled) {
          return;
        }

        setConnectionState("closed");
        reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
      });

      socket.addEventListener("error", () => {
        if (cancelled) {
          return;
        }

        setConnectionState("error");
        socket.close();
      });
    };

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [queryClient, webSessionToken, workspaceId]);

  const screenshots = useMemo(() => screenshotsQuery.data?.items ?? [], [screenshotsQuery.data?.items]);

  return {
    screenshots,
    connectionState,
    isLoading: screenshotsQuery.isLoading,
    isRefreshing: screenshotsQuery.isFetching,
    error: screenshotsQuery.error instanceof Error ? screenshotsQuery.error.message : null,
    refetch: screenshotsQuery.refetch,
  };
}
