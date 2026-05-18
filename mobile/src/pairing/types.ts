import type { PairingQrPayload, ViewerPresenceRecord } from '@screenshot-sync/contracts';
import type { PairedDeviceSession } from './sessionStore';

export type PairingPhase = 'hydrating' | 'request-permission' | 'ready' | 'pairing' | 'paired' | 'error';

export type PairingState = {
  phase: PairingPhase;
  message: string;
  payload: PairingQrPayload | null;
  workspaceId: string | null;
  deviceId: string | null;
};

export type PairingController = {
  viewerPresence: ViewerPresenceRecord | null;
  phase: PairingPhase;
  message: string;
  permissionGranted: boolean;
  showConnectedState: boolean;
  canExitScanner: boolean;
  pairingState: PairingState;
  pairedSession: PairedDeviceSession | null;
  lastErrorDebug: string | null;
  requestCameraAccess: () => void;
  enterScannerMode: () => void;
  exitScannerMode: () => void;
  disconnectDevice: () => void;
  handleBarcodeScanned: (event: { data: string }) => void;
};
