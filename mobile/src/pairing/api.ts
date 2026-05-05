import type { PairingCompleteRequest, PairingCompleteResponse, PairingQrPayload } from '@screenshot-sync/contracts';
import { PairingFlowError } from './logging';

function isPairingQrPayload(value: unknown): value is PairingQrPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.type === 'screenshot-sync-pairing' &&
    typeof candidate.serverUrl === 'string' &&
    typeof candidate.workspaceId === 'string' &&
    typeof candidate.pairingSessionId === 'string' &&
    typeof candidate.pairingToken === 'string'
  );
}

export function parsePairingQrPayload(rawValue: string): PairingQrPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new PairingFlowError('This QR code is not a Screenshot Sync pairing code.', 'PAIRING_QR_PARSE_FAILED');
  }

  if (!isPairingQrPayload(parsed)) {
    throw new PairingFlowError('This QR code is not a Screenshot Sync pairing code.', 'PAIRING_QR_INVALID_SHAPE');
  }

  return parsed;
}

export function getConfiguredServerUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_SERVER_URL;

  if (!configuredUrl) {
    throw new PairingFlowError(
      'EXPO_PUBLIC_SERVER_URL is not configured for the mobile app.',
      'PAIRING_SERVER_URL_MISSING',
    );
  }

  return configuredUrl.replace(/\/$/, '');
}

export async function completePairingSession(
  qrPayload: PairingQrPayload,
  deviceName: string,
  appVersion: string,
): Promise<PairingCompleteResponse> {
  const serverUrl = getConfiguredServerUrl();
  const request: PairingCompleteRequest = {
    workspaceId: qrPayload.workspaceId,
    pairingSessionId: qrPayload.pairingSessionId,
    pairingToken: qrPayload.pairingToken,
    device: {
      platform: 'android',
      deviceName,
      appVersion,
    },
  };

  let response: Response;

  try {
    response = await fetch(`${serverUrl}/api/pairing/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  } catch (error) {
    throw new PairingFlowError('Could not reach the pairing server.', 'PAIRING_NETWORK_FAILED', {
      serverUrl,
      workspaceId: qrPayload.workspaceId,
      pairingSessionId: qrPayload.pairingSessionId,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (!response.ok) {
    let serverError: string | null = null;
    let message = 'Could not connect this phone.';

    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        serverError = body.error;
        message = body.error;
      }
    } catch {
      // keep default message
    }

    throw new PairingFlowError(message, 'PAIRING_REQUEST_FAILED', {
      serverUrl,
      status: response.status,
      workspaceId: qrPayload.workspaceId,
      pairingSessionId: qrPayload.pairingSessionId,
      serverError,
    });
  }

  return (await response.json()) as PairingCompleteResponse;
}
