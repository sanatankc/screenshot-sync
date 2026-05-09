import { useEffect } from 'react';
import { ensureScreenshotPermission, startReliabilityMode, stopReliabilityMode } from '../detection/screenshotDetector';
import type { PairedDeviceSession } from '../pairing/sessionStore';
import { ensureUploadNotificationsReady } from './notifications';

export function useUploadClient(session: PairedDeviceSession | null) {
  useEffect(() => {
    if (!session) {
      console.log('[native-upload] no paired session, stopping reliability mode');
      void stopReliabilityMode().catch(() => undefined);
      return;
    }

    void (async () => {
      console.log('[native-upload] boot', {
        deviceId: session.deviceId,
        workspaceId: session.workspaceId,
        serverUrl: session.serverUrl,
      });
      const hasImagePermission = await ensureScreenshotPermission();
      console.log('[native-upload] image permission', { hasImagePermission });
      await ensureUploadNotificationsReady();
      console.log('[native-upload] notifications ready');

      if (!hasImagePermission) {
        console.log('[native-upload] skipping reliability mode start because image permission is missing');
        return;
      }

      console.log('[native-upload] starting reliability mode');
      await startReliabilityMode();
      console.log('[native-upload] reliability mode started');
    })().catch(() => undefined);
  }, [session]);
}
