import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PairingSessionCreateResponse, PairingUpdatedEvent, WorkspaceEvent } from "@screenshot-sync/contracts";
import { createPairingSession, disconnectViewerSession, restoreViewerSession, updateViewerSessionClientName } from "@/lib/api";
import {
  API_BASE_URL,
  toPairingWebSocketUrl,
  VIEWER_SESSION_STORAGE_KEY,
  VIEWER_CLIENT_NAME_STORAGE_KEY,
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
  clientName: string;
  setClientName: (value: string) => void;
  refresh: () => void;
  disconnect: () => void;
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

function generateDefaultClientName() {
  const first = ["Velvet", "Quiet", "Silver", "Golden", "Neon", "Feral", "Midnight", "Soft", "Static", "Lunar", "Glass", "Electric"];
  const second = ["Canvas", "Signal", "Harbor", "Studio", "Orbit", "Frame", "Relay", "Archive", "Window", "Terminal", "Beacon", "Atlas"];
  const left = first[Math.floor(Math.random() * first.length)];
  const right = second[Math.floor(Math.random() * second.length)];
  return `${left} ${right}`;
}

function loadStoredClientName() {
  const raw = window.localStorage.getItem(VIEWER_CLIENT_NAME_STORAGE_KEY)?.trim();
  return raw || generateDefaultClientName();
}

function saveStoredClientName(clientName: string) {
  window.localStorage.setItem(VIEWER_CLIENT_NAME_STORAGE_KEY, clientName);
}

export function usePairingFlow(): PairingFlowState {
  const [phase, setPhase] = useState<PairingPhase>("booting");
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [pairingSession, setPairingSession] = useState<PairingSessionCreateResponse | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [webSessionToken, setWebSessionToken] = useState<string | null>(null);
  const [pairedDeviceName, setPairedDeviceName] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<"pairing" | "connection" | null>(null);
  const [clientName, setClientName] = useState(() => loadStoredClientName());
  const socketRef = useRef<WebSocket | null>(null);
  const socketGenerationRef = useRef(0);
  const clientNameRef = useRef(clientName);

  useEffect(() => {
    clientNameRef.current = clientName;
    saveStoredClientName(clientName.trim() || generateDefaultClientName());
  }, [clientName]);

  useEffect(() => {
    const token = webSessionToken;
    if (!token) {
      return;
    }

    const normalizedName = clientName.trim();
    const timeout = window.setTimeout(() => {
      void updateViewerSessionClientName(API_BASE_URL, token, normalizedName || generateDefaultClientName()).catch(() => {
        // Keep local editing responsive even if the network update fails.
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [clientName, webSessionToken]);

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
      const session = await createPairingSession(API_BASE_URL, clientNameRef.current);
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

  const resetLocalState = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setPairingSession(null);
    setWebSessionToken(null);
    setWorkspaceId(null);
    setPairedDeviceName(null);
    setConnectionState("idle");
    setErrorState(null);
    clearStoredViewerSession();
  }, []);

  const refresh = useCallback(() => {
    void startFreshPairing();
  }, [startFreshPairing]);

  const disconnect = useCallback(() => {
    const token = webSessionToken;
    resetLocalState();
    if (token) {
      void disconnectViewerSession(API_BASE_URL, token).catch(() => {
        // best effort: local reset already happened
      });
    }
    void startFreshPairing();
  }, [resetLocalState, startFreshPairing, webSessionToken]);

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
        if (restored.clientName?.trim()) {
          setClientName(restored.clientName);
        }
        setPhase("paired");
      } catch {
        clearStoredViewerSession();
        await startFreshPairing();
      }
    })();

    return () => {
      socketGenerationRef.current += 1;
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

    socketGenerationRef.current += 1;
    const generation = socketGenerationRef.current;

    socketRef.current?.close();
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    setConnectionState("connecting");

    socket.addEventListener("open", () => {
      if (socketGenerationRef.current !== generation || socketRef.current !== socket) {
        return;
      }
      setConnectionState("open");
    });

    socket.addEventListener("message", (event) => {
      if (socketGenerationRef.current !== generation || socketRef.current !== socket) {
        return;
      }

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
      if (socketGenerationRef.current !== generation || socketRef.current !== socket) {
        return;
      }
      setConnectionState((current) => (current === "error" ? current : "closed"));
    });

    socket.addEventListener("error", () => {
      if (socketGenerationRef.current !== generation || socketRef.current !== socket) {
        return;
      }
      setConnectionState("error");
      setPhase("error");
      setErrorState("connection");
    });

    return () => {
      if (socketGenerationRef.current === generation && socketRef.current === socket) {
        socketRef.current = null;
      }
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
    clientName,
    setClientName,
    refresh,
    disconnect,
  };
}
