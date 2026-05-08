import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PairingSessionCreateResponse, PairingUpdatedEvent, WorkspaceEvent } from "@screenshot-sync/contracts";
import { createPairingSession, restoreViewerSession } from "@/lib/api";
import {
  API_BASE_URL,
  toPairingWebSocketUrl,
  VIEWER_SESSION_STORAGE_KEY,
} from "@/lib/runtime";

type PairingPhase = "booting" | "waiting" | "paired" | "error";
type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

type PairingFlowState = {
  phase: PairingPhase;
  connectionState: ConnectionState;
  session: PairingSessionCreateResponse | null;
  workspaceId: string | null;
  webSessionToken: string | null;
  pairedDeviceName: string | null;
  error: string | null;
  refresh: () => void;
};

type StoredViewerSession = {
  workspaceId: string;
  webSessionToken: string;
};

function loadStoredViewerSession(): StoredViewerSession | null {
  const raw = window.localStorage.getItem(VIEWER_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredViewerSession;
    if (typeof parsed.workspaceId !== "string" || typeof parsed.webSessionToken !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredViewerSession(session: StoredViewerSession) {
  window.localStorage.setItem(VIEWER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredViewerSession() {
  window.localStorage.removeItem(VIEWER_SESSION_STORAGE_KEY);
}

export function usePairingFlow(): PairingFlowState {
  const [phase, setPhase] = useState<PairingPhase>("booting");
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [pairingSession, setPairingSession] = useState<PairingSessionCreateResponse | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [webSessionToken, setWebSessionToken] = useState<string | null>(null);
  const [pairedDeviceName, setPairedDeviceName] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<"pairing" | "connection" | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const startFreshPairing = useCallback(async () => {
    socketRef.current?.close();
    socketRef.current = null;
    setPhase("booting");
    setConnectionState("idle");
    setPairedDeviceName(null);
    setErrorState(null);
    setWorkspaceId(null);
    clearStoredViewerSession();

    try {
      const session = await createPairingSession(API_BASE_URL);
      setPairingSession(session);
      setWebSessionToken(session.webSessionToken);
      setPhase("waiting");
    } catch {
      setPairingSession(null);
      setWebSessionToken(null);
      setPhase("error");
      setConnectionState("error");
      setErrorState("pairing");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const stored = loadStoredViewerSession();

      if (!stored) {
        await startFreshPairing();
        return;
      }

      setWebSessionToken(stored.webSessionToken);
      setWorkspaceId(stored.workspaceId);
      setPhase("booting");
      setConnectionState("idle");
      setPairedDeviceName(null);
      setErrorState(null);

      try {
        const restored = await restoreViewerSession(API_BASE_URL, stored.webSessionToken);
        setWorkspaceId(restored.workspaceId);
        setPhase("paired");
      } catch {
        clearStoredViewerSession();
        await startFreshPairing();
      }
    })();

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [startFreshPairing]);

  useEffect(() => {
    const token = webSessionToken;
    if (!token || phase !== "waiting" || !pairingSession) {
      return;
    }

    const socketUrl = toPairingWebSocketUrl(API_BASE_URL, pairingSession.pairingSessionId, token);

    socketRef.current?.close();
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    setConnectionState("connecting");

    socket.addEventListener("open", () => {
      setConnectionState("open");
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data)) as WorkspaceEvent;

      if (payload.type !== "pairing.updated") {
        return;
      }

      const pairingEvent = payload as PairingUpdatedEvent;
      if (pairingEvent.status === "paired") {
        setPairedDeviceName(pairingEvent.device?.deviceName ?? null);
        setWorkspaceId(pairingEvent.workspaceId);
        saveStoredViewerSession({
          workspaceId: pairingEvent.workspaceId,
          webSessionToken: token,
        });
        setPhase("paired");
      }
    });

    socket.addEventListener("close", () => {
      setConnectionState((current) => (current === "error" ? current : "closed"));
    });

    socket.addEventListener("error", () => {
      setConnectionState("error");
      setPhase("error");
      setErrorState("connection");
    });

    return () => {
      socket.close();
    };
  }, [pairingSession, phase, webSessionToken]);

  const error = useMemo(() => {
    if (errorState === "pairing") {
      return "Could not create pairing session.";
    }

    if (errorState === "connection") {
      return "Connection lost.";
    }

    return null;
  }, [errorState]);

  return {
    phase,
    connectionState,
    session: pairingSession,
    workspaceId,
    webSessionToken,
    pairedDeviceName,
    error,
    refresh: () => {
      void startFreshPairing();
    },
  };
}
