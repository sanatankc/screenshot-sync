import { PairingQrCard } from "@/components/pairing/pairing-qr-card";
import type { PairingSessionCreateResponse } from "@screenshot-sync/contracts";

type PairingStageProps = {
  phase: "booting" | "waiting" | "paired" | "error";
  connectionState: "idle" | "connecting" | "open" | "closed" | "error";
  session: PairingSessionCreateResponse | null;
  pairedDeviceName: string | null;
  error: string | null;
  onRefresh: () => void;
};

function getStatusLabel(phase: PairingStageProps["phase"], connectionState: PairingStageProps["connectionState"]) {
  if (phase === "paired") return "paired";
  if (phase === "error") return "retry";
  if (connectionState === "open") return "live";
  if (connectionState === "connecting") return "syncing";
  return "loading";
}

export function PairingStage({
  phase,
  connectionState,
  session,
  pairedDeviceName,
  error,
  onRefresh,
}: PairingStageProps) {
  const qrValue = session ? JSON.stringify(session.qrPayload) : null;
  const statusLabel = getStatusLabel(phase, connectionState);
  const message = phase === "paired"
    ? pairedDeviceName ?? "Phone connected"
    : error ?? (connectionState === "open" ? "Waiting for scan" : "Preparing session");

  return (
    <section className="flex w-full justify-center animate-in fade-in zoom-in-95 duration-500">
      <PairingQrCard
        qrValue={qrValue}
        workspaceId={session?.workspaceId ?? null}
        statusLabel={statusLabel}
        message={message}
        isReady={Boolean(qrValue)}
        onRefresh={onRefresh}
      />
    </section>
  );
}
