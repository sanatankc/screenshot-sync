import { AppFrame } from "@/components/app/app-frame";
import { PairingStage } from "@/components/pairing/pairing-stage";
import { usePairingFlow } from "@/hooks/use-pairing-flow";

export default function App() {
  const pairing = usePairingFlow();

  return (
    <AppFrame>
      <PairingStage
        phase={pairing.phase}
        connectionState={pairing.connectionState}
        session={pairing.session}
        workspaceId={pairing.workspaceId}
        pairedDeviceName={pairing.pairedDeviceName}
        error={pairing.error}
        onRefresh={pairing.refresh}
      />
    </AppFrame>
  );
}
