import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'upload-status';

let notificationsReady = false;

export async function ensureUploadNotificationsReady() {
  if (notificationsReady) {
    return true;
  }

  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Upload status',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: '#e5dece',
    });

    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted && permissions.canAskAgain) {
      await Notifications.requestPermissionsAsync();
    }

    notificationsReady = true;
    return true;
  } catch {
    return false;
  }
}

export async function notifyUploadBatchStarted(count: number) {
  if (!(await ensureUploadNotificationsReady())) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: count === 1 ? 'Uploading screenshot' : `Uploading ${count} screenshots`,
      body: 'Captr is sending new captures in the background.',
      sound: false,
    },
    trigger: null,
  });
}

export async function notifyUploadBatchFinished(successCount: number, failureCount: number) {
  if (!(await ensureUploadNotificationsReady())) {
    return;
  }

  const title = failureCount > 0
    ? successCount > 0
      ? `Uploaded ${successCount}, ${failureCount} failed`
      : `Upload failed for ${failureCount}`
    : successCount === 1
      ? 'Uploaded 1 screenshot'
      : `Uploaded ${successCount} screenshots`;

  const body = failureCount > 0
    ? 'We will retry failed screenshots automatically.'
    : 'Your latest screenshots have been synced.';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: false,
    },
    trigger: null,
  });
}
