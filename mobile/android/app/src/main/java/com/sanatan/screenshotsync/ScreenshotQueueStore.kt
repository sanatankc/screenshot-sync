package com.sanatan.screenshotsync

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class ScreenshotQueueStore(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
  companion object {
    const val DATABASE_NAME = "screenshot-sync.db"
    private const val DATABASE_VERSION = 2
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

    return statement.executeInsert() != -1L
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
