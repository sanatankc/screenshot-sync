import { AppFrame } from "@/components/app/app-frame";
import { GalleryStage } from "@/components/gallery";
import { DownloadRedirectStage } from "@/components/pairing/download-redirect-stage";
import { OpenStage } from "@/components/pairing/open-stage";
import { PairingStage } from "@/components/pairing/pairing-stage";
import { usePairingFlow } from "@/hooks/use-pairing-flow";
import { useWorkspaceGallery } from "@/hooks/use-workspace-gallery";

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/download/android/latest") {
    return (
      <AppFrame>
        <DownloadRedirectStage />
      </AppFrame>
    );
  }

  if (pathname === "/open") {
    return (
      <AppFrame>
        <OpenStage rawUrl={window.location.href} />
      </AppFrame>
    );
  }

  const pairing = usePairingFlow();
  const gallery = useWorkspaceGallery(pairing.workspaceId, pairing.webSessionToken);

  const showGallery = pairing.phase === "paired" && pairing.workspaceId && pairing.webSessionToken;

  if (!showGallery) {
    return (
      <AppFrame>
        <PairingStage
          phase={pairing.phase}
          connectionState={pairing.connectionState}
          session={pairing.session}
          workspaceId={pairing.workspaceId}
          pairedDeviceName={pairing.pairedDeviceName}
          error={pairing.error}
          clientName={pairing.clientName}
          onClientNameChange={pairing.setClientName}
          onRefresh={pairing.refresh}
        />
      </AppFrame>
    );
  }

  const workspaceId = pairing.workspaceId;
  const webSessionToken = pairing.webSessionToken;

  return (
    <AppFrame>
      <GalleryStage
        workspaceId={workspaceId!}
        webSessionToken={webSessionToken!}
        connectionState={gallery.connectionState}
        screenshots={gallery.screenshots}
        isLoading={gallery.isLoading}
        isRefreshing={gallery.isRefreshing}
        error={gallery.error}
        pairedDeviceName={pairing.pairedDeviceName}
        onRefresh={() => {
          void gallery.refetch();
        }}
        onReset={pairing.refresh}
      />
    </AppFrame>
  );
}
