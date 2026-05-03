package com.sanatan.screenshotsync

import android.content.ContentResolver
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import java.util.Locale

class ScreenshotScanner(private val context: Context) {
  companion object {
    private const val DEFAULT_QUERY_LIMIT = 24
    private const val RECONCILIATION_QUERY_LIMIT = 180
    private const val LIVE_RECENCY_WINDOW_MS = 2 * 60 * 1000L
    private const val RECONCILIATION_WINDOW_MS = 24 * 60 * 60 * 1000L
  }

  private var detectionSequence = 0L

  fun scanRecentScreenshots(limit: Int = DEFAULT_QUERY_LIMIT): List<ScreenshotCandidateRecord> {
    return queryScreenshots(limit, LIVE_RECENCY_WINDOW_MS)
  }

  fun reconcileRecentScreenshots(limit: Int = RECONCILIATION_QUERY_LIMIT): List<ScreenshotCandidateRecord> {
    return queryScreenshots(limit, RECONCILIATION_WINDOW_MS)
  }

  private fun queryScreenshots(limit: Int, recencyWindowMs: Long): List<ScreenshotCandidateRecord> {
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.RELATIVE_PATH,
      MediaStore.Images.Media.DATE_ADDED,
      MediaStore.Images.Media.DATE_TAKEN,
      MediaStore.Images.Media.MIME_TYPE,
      MediaStore.Images.Media.WIDTH,
      MediaStore.Images.Media.HEIGHT,
    )

    val cursor =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val queryArgs = Bundle().apply {
          putString(ContentResolver.QUERY_ARG_SQL_SORT_ORDER, "${MediaStore.Images.Media.DATE_ADDED} DESC")
          putInt(ContentResolver.QUERY_ARG_LIMIT, limit)
        }
        context.contentResolver.query(
          MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
          projection,
          queryArgs,
          null,
        )
      } else {
        context.contentResolver.query(
          MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
          projection,
          null,
          null,
          "${MediaStore.Images.Media.DATE_ADDED} DESC",
        )
      }

    val now = System.currentTimeMillis()
    val candidates = mutableListOf<ScreenshotCandidateRecord>()

    cursor?.use { currentCursor ->
      val idColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val nameColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
      val relativePathColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH)
      val dateAddedColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
      val dateTakenColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
      val mimeTypeColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
      val widthColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
      val heightColumn = currentCursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)

      while (currentCursor.moveToNext()) {
        val mediaId = currentCursor.getLong(idColumn)
        val fileName = currentCursor.getString(nameColumn) ?: continue
        val relativePath = currentCursor.getString(relativePathColumn) ?: ""
        val dateAddedSeconds = currentCursor.getLong(dateAddedColumn)
        val dateTakenMillis = currentCursor.getLong(dateTakenColumn)
        val mimeType = currentCursor.getString(mimeTypeColumn) ?: ""
        val width = currentCursor.getInt(widthColumn)
        val height = currentCursor.getInt(heightColumn)
        val capturedAt = if (dateTakenMillis > 0L) dateTakenMillis else dateAddedSeconds * 1000L

        if (!isLikelyScreenshot(fileName, relativePath, capturedAt, now, recencyWindowMs)) {
          continue
        }

        candidates.add(
          ScreenshotCandidateRecord(
            id = "candidate-$mediaId",
            mediaStoreId = mediaId,
            uri = "${MediaStore.Images.Media.EXTERNAL_CONTENT_URI}/$mediaId",
            fileName = fileName,
            relativePath = relativePath,
            mimeType = mimeType,
            width = width,
            height = height,
            capturedAt = capturedAt,
            detectedAt = now,
            sequence = (++detectionSequence).toInt(),
          )
        )
      }
    }

    return candidates
  }

  private fun isLikelyScreenshot(
    fileName: String,
    relativePath: String,
    detectedTimestamp: Long,
    now: Long,
    recencyWindowMs: Long,
  ): Boolean {
    val lowerName = fileName.lowercase(Locale.US)
    val lowerPath = relativePath.lowercase(Locale.US)

    val pathLooksRight = lowerPath.contains("screenshot")
    val nameLooksRight =
      lowerName.contains("screenshot") ||
        lowerName.contains("screen_shot") ||
        lowerName.contains("screen-shot") ||
        lowerName.startsWith("screenshot_")

    val isRecentEnough = now - detectedTimestamp <= recencyWindowMs

    return (pathLooksRight || nameLooksRight) && isRecentEnough
  }
}
