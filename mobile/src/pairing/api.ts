import type { PairingCompleteRequest, PairingCompleteResponse, PairingQrPayload, ResolvedPairingPayload } from '@screenshot-sync/contracts';
import { parsePairingValue } from '@screenshot-sync/contracts';
import { PUBLIC_APP_CONFIG } from '../config/publicAppConfig';
import { PairingFlowError } from './logging';

export function parsePairingQrPayload(rawValue: string): ResolvedPairingPayload {
  const resolved = parsePairingValue(rawValue);

  if (!resolved) {
    throw new PairingFlowError('This QR code is not a Captr pairing code.', 'PAIRING_QR_INVALID_SHAPE');
  }

  return resolved;
}

export function getConfiguredServerUrl(overrideServerUrl?: string | null) {
  const configuredUrl =
    overrideServerUrl ?? process.env.EXPO_PUBLIC_SERVER_URL ?? PUBLIC_APP_CONFIG.apiBaseUrl;

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
  deviceIdentity: string,
  deviceName: string,
  appVersion: string,
  serverUrlOverride?: string | null,
): Promise<PairingCompleteResponse> {
  const serverUrl = getConfiguredServerUrl(serverUrlOverride);
  const request: PairingCompleteRequest = {
    pairingSessionId: qrPayload.pairingSessionId,
    pairingToken: qrPayload.pairingToken,
    device: {
      deviceIdentity,
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
      pairingSessionId: qrPayload.pairingSessionId,
      serverError,
    });
  }

  return (await response.json()) as PairingCompleteResponse;
}
