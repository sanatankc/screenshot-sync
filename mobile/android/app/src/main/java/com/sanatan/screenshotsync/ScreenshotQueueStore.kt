package com.sanatan.screenshotsync

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class ScreenshotQueueStore(private val appContext: Context) : SQLiteOpenHelper(appContext, DATABASE_NAME, null, DATABASE_VERSION) {
  companion object {
    private const val TAG = "ScreenshotQueueStore"
    const val DATABASE_NAME = "screenshot-sync.db"
    private const val DATABASE_VERSION = 3
    private const val SESSION_PREFS_NAME = "screenshot_sync_paired_session"
    private const val KEY_WORKSPACE_ID = "workspace_id"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_DEVICE_TOKEN = "device_token"
    private const val KEY_SERVER_URL = "server_url"
    private const val KEY_CONNECTED_AT = "connected_at"
    private val isoFormatter =
      SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
      }
  }

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS screenshot_queue (
        id TEXT PRIMARY KEY NOT NULL,
        media_store_id TEXT,
        uri TEXT NOT NULL,
        file_name TEXT NOT NULL,
        relative_path TEXT,
        mime_type TEXT,
        width INTEGER,
        height INTEGER,
        captured_at TEXT,
        detected_at TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        uploaded_at TEXT
      );
      """.trimIndent()
    )

    db.execSQL(
      """
      CREATE UNIQUE INDEX IF NOT EXISTS idx_screenshot_queue_uri
      ON screenshot_queue(uri);
      """.trimIndent()
    )

    db.execSQL(
      """
      CREATE UNIQUE INDEX IF NOT EXISTS idx_screenshot_queue_media_store_id
      ON screenshot_queue(media_store_id)
      WHERE media_store_id IS NOT NULL;
      """.trimIndent()
    )

    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS paired_device_session (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        workspace_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        device_token TEXT NOT NULL,
        server_url TEXT NOT NULL,
        connected_at TEXT NOT NULL
      );
      """.trimIndent()
    )
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    onCreate(db)
    ensureColumn(db, "screenshot_queue", "mime_type", "TEXT")
    ensureColumn(db, "screenshot_queue", "width", "INTEGER")
    ensureColumn(db, "screenshot_queue", "height", "INTEGER")
    ensureColumn(db, "screenshot_queue", "captured_at", "TEXT")
  }

  fun enqueueCandidate(candidate: ScreenshotCandidateRecord): Boolean {
    val database = writableDatabase
    val statement = database.compileStatement(
      """
      INSERT OR IGNORE INTO screenshot_queue (
        id,
        media_store_id,
        uri,
        file_name,
        relative_path,
        mime_type,
        width,
        height,
        captured_at,
        detected_at,
        status,
        retry_count,
        last_error,
        uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, NULL, NULL);
      """.trimIndent()
    )

    statement.bindString(1, candidate.id)
    statement.bindString(2, candidate.mediaStoreId.toString())
    statement.bindString(3, candidate.uri)
    statement.bindString(4, candidate.fileName)
    statement.bindString(5, candidate.relativePath)
    statement.bindString(6, candidate.mimeType)
    statement.bindLong(7, candidate.width.toLong())
    statement.bindLong(8, candidate.height.toLong())
    statement.bindString(9, isoFormatter.format(Date(candidate.capturedAt)))
    statement.bindString(10, isoFormatter.format(Date(candidate.detectedAt)))

    val inserted = statement.executeInsert() != -1L
    Log.d(TAG, "enqueueCandidate id=${candidate.id} inserted=$inserted mediaStoreId=${candidate.mediaStoreId}")
    return inserted
  }

  fun loadPairedDeviceSession(): PairedDeviceSessionRecord? {
    val prefs = appContext.getSharedPreferences(SESSION_PREFS_NAME, Context.MODE_PRIVATE)
    val workspaceId = prefs.getString(KEY_WORKSPACE_ID, null)
    val deviceId = prefs.getString(KEY_DEVICE_ID, null)
    val deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null)
    val serverUrl = prefs.getString(KEY_SERVER_URL, null)
    val connectedAt = prefs.getString(KEY_CONNECTED_AT, null)

    if (workspaceId == null || deviceId == null || deviceToken == null || serverUrl == null || connectedAt == null) {
      Log.d(TAG, "loadPairedDeviceSession none")
      return null
    }

    val session = PairedDeviceSessionRecord(
      workspaceId = workspaceId,
      deviceId = deviceId,
      deviceToken = deviceToken,
      serverUrl = serverUrl,
      connectedAt = connectedAt,
    )
    Log.d(TAG, "loadPairedDeviceSession deviceId=${session.deviceId} workspaceId=${session.workspaceId}")
    return session
  }

  fun savePairedDeviceSession(session: PairedDeviceSessionRecord) {
    appContext.getSharedPreferences(SESSION_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_WORKSPACE_ID, session.workspaceId)
      .putString(KEY_DEVICE_ID, session.deviceId)
      .putString(KEY_DEVICE_TOKEN, session.deviceToken)
      .putString(KEY_SERVER_URL, session.serverUrl)
      .putString(KEY_CONNECTED_AT, session.connectedAt)
      .apply()
    Log.d(TAG, "savePairedDeviceSession deviceId=${session.deviceId} workspaceId=${session.workspaceId}")
  }

  fun clearPairedDeviceSession() {
    appContext.getSharedPreferences(SESSION_PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .clear()
      .apply()
    Log.d(TAG, "clearPairedDeviceSession")
  }

  fun listUploadableItems(limit: Int = 8): List<QueuedScreenshotRecord> {
    val database = readableDatabase
    val items = mutableListOf<QueuedScreenshotRecord>()

    database.rawQuery(
      """
      SELECT id, media_store_id, uri, file_name, relative_path, mime_type, width, height, captured_at, detected_at, status, retry_count, last_error, uploaded_at
      FROM screenshot_queue
      WHERE status = 'queued' OR (status = 'failed' AND retry_count < 3)
      ORDER BY detected_at ASC
      LIMIT ?;
      """.trimIndent(),
      arrayOf(limit.toString()),
    ).use { cursor ->
      while (cursor.moveToNext()) {
        items.add(
          QueuedScreenshotRecord(
            id = cursor.getString(0),
            mediaStoreId = cursor.getString(1),
            uri = cursor.getString(2),
            fileName = cursor.getString(3),
            relativePath = cursor.getString(4),
            mimeType = cursor.getString(5),
            width = if (cursor.isNull(6)) null else cursor.getInt(6),
            height = if (cursor.isNull(7)) null else cursor.getInt(7),
            capturedAt = if (cursor.isNull(8)) null else cursor.getString(8),
            detectedAt = cursor.getString(9),
            status = cursor.getString(10),
            retryCount = cursor.getInt(11),
            lastError = if (cursor.isNull(12)) null else cursor.getString(12),
            uploadedAt = if (cursor.isNull(13)) null else cursor.getString(13),
          )
        )
      }
    }

    Log.d(TAG, "listUploadableItems count=${items.size} limit=$limit")
    return items
  }

  fun markUploading(id: String) {
    Log.d(TAG, "markUploading id=$id")
    writableDatabase.execSQL(
      """
      UPDATE screenshot_queue
      SET status = 'uploading', last_error = NULL
      WHERE id = ?;
      """.trimIndent(),
      arrayOf(id),
    )
  }

  fun markUploaded(id: String) {
    Log.d(TAG, "markUploaded id=$id")
    writableDatabase.execSQL(
      """
      UPDATE screenshot_queue
      SET status = 'uploaded', uploaded_at = ?, last_error = NULL
      WHERE id = ?;
      """.trimIndent(),
      arrayOf(isoFormatter.format(Date()), id),
    )
  }

  fun markFailed(id: String, error: String) {
    Log.e(TAG, "markFailed id=$id error=$error")
    writableDatabase.execSQL(
      """
      UPDATE screenshot_queue
      SET status = 'failed', retry_count = retry_count + 1, last_error = ?
      WHERE id = ?;
      """.trimIndent(),
      arrayOf(error, id),
    )
  }

  fun resetUploadingItems() {
    Log.d(TAG, "resetUploadingItems")
    writableDatabase.execSQL(
      """
      UPDATE screenshot_queue
      SET status = 'queued'
      WHERE status = 'uploading';
      """.trimIndent()
    )
  }

  private fun ensureColumn(db: SQLiteDatabase, tableName: String, columnName: String, columnDefinition: String) {
    db.rawQuery("PRAGMA table_info($tableName)", null).use { cursor ->
      val nameColumn = cursor.getColumnIndexOrThrow("name")
      while (cursor.moveToNext()) {
        if (cursor.getString(nameColumn) == columnName) {
          return
        }
      }
    }

    db.execSQL("ALTER TABLE $tableName ADD COLUMN $columnName $columnDefinition")
  }
}

data class PairedDeviceSessionRecord(
  val workspaceId: String,
  val deviceId: String,
  val deviceToken: String,
  val serverUrl: String,
  val connectedAt: String,
)

data class QueuedScreenshotRecord(
  val id: String,
  val mediaStoreId: String?,
  val uri: String,
  val fileName: String,
  val relativePath: String?,
  val mimeType: String?,
  val width: Int?,
  val height: Int?,
  val capturedAt: String?,
  val detectedAt: String,
  val status: String,
  val retryCount: Int,
  val lastError: String?,
  val uploadedAt: String?,
)
