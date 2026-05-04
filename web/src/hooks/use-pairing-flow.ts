import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { PairingSessionCreateResponse, PairingUpdatedEvent, WorkspaceEvent } from "@screenshot-sync/contracts";
import { createPairingSession } from "@/lib/api";
import { API_BASE_URL, toWorkspaceWebSocketUrl } from "@/lib/runtime";

type PairingPhase = "booting" | "waiting" | "paired" | "error";
type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

type PairingFlowState = {
  phase: PairingPhase;
  connectionState: ConnectionState;
  session: PairingSessionCreateResponse | null;
  pairedDeviceName: string | null;
  error: string | null;
  refresh: () => void;
};

export function usePairingFlow(): PairingFlowState {
  const [phase, setPhase] = useState<PairingPhase>("booting");
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [pairedDeviceName, setPairedDeviceName] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const pairingMutation = useMutation({
    mutationFn: () => createPairingSession(API_BASE_URL),
    onMutate: () => {
      setPhase("booting");
      setConnectionState("idle");
      setPairedDeviceName(null);
    },
    onSuccess: () => {
      setPhase("waiting");
    },
    onError: () => {
      setPhase("error");
      setConnectionState("error");
    },
  });

  useEffect(() => {
    pairingMutation.mutate();

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
    // intentional one-time bootstrap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const session = pairingMutation.data;
    if (!session || phase === "paired") {
      return;
    }

    socketRef.current?.close();

    const socket = new WebSocket(
      toWorkspaceWebSocketUrl(API_BASE_URL, session.workspaceId, session.webSessionToken),
    );

    socketRef.current = socket;
    setConnectionState("connecting");

    socket.addEventListener("open", () => {
      setConnectionState("open");
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data)) as WorkspaceEvent;

      if (payload.type === "pairing.updated") {
        const pairingEvent = payload as PairingUpdatedEvent;
        if (pairingEvent.status === "paired") {
          setPairedDeviceName(pairingEvent.device?.deviceName ?? null);
          setPhase("paired");
        }
      }
    });

    socket.addEventListener("close", () => {
      setConnectionState((current) => (current === "error" ? current : "closed"));
    });

    socket.addEventListener("error", () => {
      setConnectionState("error");
      setPhase((current) => (current === "paired" ? current : "error"));
    });

    return () => {
      socket.close();
    };
  }, [pairingMutation.data, phase]);

  const error = useMemo(() => {
    if (pairingMutation.isError) {
      return "Could not create pairing session.";
    }

    if (phase === "error") {
      return "Connection lost.";
    }

    return null;
  }, [pairingMutation.isError, phase]);

  return {
    phase,
    connectionState,
    session: pairingMutation.data ?? null,
    pairedDeviceName,
    error,
    refresh: () => {
      socketRef.current?.close();
      socketRef.current = null;
      pairingMutation.reset();
      pairingMutation.mutate();
    },
  };
}
