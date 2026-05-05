import { database } from '../storage/bootstrap';

export type PairedDeviceSession = {
  workspaceId: string;
  deviceId: string;
  deviceToken: string;
  serverUrl: string;
  connectedAt: string;
};

export async function loadPairedDeviceSession(): Promise<PairedDeviceSession | null> {
  const row = database.getFirstSync<{
    workspace_id: string;
    device_id: string;
    device_token: string;
    server_url: string;
    connected_at: string;
  }>(
    `
      SELECT workspace_id, device_id, device_token, server_url, connected_at
      FROM paired_device_session
      WHERE id = 1
      LIMIT 1;
    `,
  );

  if (!row) {
    return null;
  }

  return {
    workspaceId: row.workspace_id,
    deviceId: row.device_id,
    deviceToken: row.device_token,
    serverUrl: row.server_url,
    connectedAt: row.connected_at,
  };
}

export async function savePairedDeviceSession(session: PairedDeviceSession) {
  database.runSync(
    `
      INSERT INTO paired_device_session (id, workspace_id, device_id, device_token, server_url, connected_at)
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id,
        device_id = excluded.device_id,
        device_token = excluded.device_token,
        server_url = excluded.server_url,
        connected_at = excluded.connected_at;
    `,
    [session.workspaceId, session.deviceId, session.deviceToken, session.serverUrl, session.connectedAt],
  );
}

export async function clearPairedDeviceSession() {
  database.runSync('DELETE FROM paired_device_session WHERE id = 1;');
}
