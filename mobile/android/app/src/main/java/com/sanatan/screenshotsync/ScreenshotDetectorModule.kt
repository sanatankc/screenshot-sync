package com.sanatan.screenshotsync

import android.content.ContentResolver
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

class ScreenshotDetectorModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    private const val RECENT_SCREENSHOT_QUERY_LIMIT = 12
  }

  private var contentObserver: ContentObserver? = null
  private var isWatching = false
  private var listenerCount = 0
  private var detectionSequence = 0L
  private val seenMediaIds = LinkedHashSet<Long>()

  override fun getName(): String = "ScreenshotDetector"

  @ReactMethod
  fun startWatching(promise: Promise) {
    if (isWatching) {
      promise.resolve(createStatusMap())
      return
    }

    val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
      override fun onChange(selfChange: Boolean, uri: Uri?) {
        super.onChange(selfChange, uri)
        scanForRecentScreenshots()
      }
    }

    reactContext.contentResolver.registerContentObserver(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      true,
      observer
    )

    contentObserver = observer
    isWatching = true
    sendDetectorStateChanged()
    scanForRecentScreenshots()
    promise.resolve(createStatusMap())
  }

  @ReactMethod
  fun stopWatching(promise: Promise) {
    unregisterObserver()
    promise.resolve(createStatusMap())
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve(createStatusMap())
  }

  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
  }

  override fun invalidate() {
    unregisterObserver()
    super.invalidate()
  }

  private fun unregisterObserver() {
    contentObserver?.let {
      reactContext.contentResolver.unregisterContentObserver(it)
    }
    contentObserver = null
    if (isWatching) {
      isWatching = false
      sendDetectorStateChanged()
    }
  }

  private fun createStatusMap(): ReadableMap {
    val map = Arguments.createMap()
    map.putBoolean("isWatching", isWatching)
    map.putInt("listenerCount", listenerCount)
    map.putInt("seenItemCount", seenMediaIds.size)
    map.putString("platform", "android")
    return map
  }

  private fun scanForRecentScreenshots() {
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.RELATIVE_PATH,
      MediaStore.Images.Media.DATE_ADDED,
      MediaStore.Images.Media.DATE_TAKEN,
      MediaStore.Images.Media.MIME_TYPE,
      MediaStore.Images.Media.WIDTH,
      MediaStore.Images.Media.HEIGHT
    )

    val cursor =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val queryArgs = Bundle().apply {
          putString(ContentResolver.QUERY_ARG_SQL_SORT_ORDER, "${MediaStore.Images.Media.DATE_ADDED} DESC")
          putInt(ContentResolver.QUERY_ARG_LIMIT, RECENT_SCREENSHOT_QUERY_LIMIT)
        }
        reactContext.contentResolver.query(
          MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
          projection,
          queryArgs,
          null
        )
      } else {
        reactContext.contentResolver.query(
          MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
          projection,
          null,
          null,
          "${MediaStore.Images.Media.DATE_ADDED} DESC"
        )
      }

    cursor?.use { cursor ->
      val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
      val relativePathColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH)
      val dateAddedColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
      val dateTakenColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
      val mimeTypeColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
      val widthColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
      val heightColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)

      while (cursor.moveToNext()) {
        val mediaId = cursor.getLong(idColumn)
        val fileName = cursor.getString(nameColumn) ?: continue
        val relativePath = cursor.getString(relativePathColumn) ?: ""
        val dateAddedSeconds = cursor.getLong(dateAddedColumn)
        val dateTakenMillis = cursor.getLong(dateTakenColumn)
        val mimeType = cursor.getString(mimeTypeColumn) ?: ""
        val width = cursor.getInt(widthColumn)
        val height = cursor.getInt(heightColumn)
        val detectedTimestamp = if (dateTakenMillis > 0L) dateTakenMillis else dateAddedSeconds * 1000L

        if (seenMediaIds.contains(mediaId)) {
          continue
        }

        if (!isLikelyScreenshot(fileName, relativePath, detectedTimestamp)) {
          continue
        }

        seenMediaIds.add(mediaId)
        trimSeenIds()

        val screenshotUri = Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, mediaId.toString())
        val payload = Arguments.createMap().apply {
          putString("id", "candidate-$mediaId")
          putString("mediaStoreId", mediaId.toString())
          putString("uri", screenshotUri.toString())
          putString("fileName", fileName)
          putString("relativePath", relativePath)
          putString("mimeType", mimeType)
          putInt("width", width)
          putInt("height", height)
          putDouble("capturedAt", detectedTimestamp.toDouble())
          putDouble("detectedAt", System.currentTimeMillis().toDouble())
          putInt("sequence", (++detectionSequence).toInt())
        }

        emitEvent("onScreenshotDetected", payload)
      }
    }
  }

  private fun trimSeenIds() {
    while (seenMediaIds.size > 256) {
      val first = seenMediaIds.firstOrNull() ?: return
      seenMediaIds.remove(first)
    }
  }

  private fun isLikelyScreenshot(fileName: String, relativePath: String, detectedTimestamp: Long): Boolean {
    val now = System.currentTimeMillis()
    val lowerName = fileName.lowercase(Locale.US)
    val lowerPath = relativePath.lowercase(Locale.US)

    val pathLooksRight = lowerPath.contains("screenshot")
    val nameLooksRight =
      lowerName.contains("screenshot") ||
        lowerName.contains("screen_shot") ||
        lowerName.contains("screen-shot") ||
        lowerName.startsWith("screenshot_")

    val isRecentEnough = now - detectedTimestamp <= 2 * 60 * 1000

    return (pathLooksRight || nameLooksRight) && isRecentEnough
  }

  private fun sendDetectorStateChanged() {
    emitEvent("onDetectorStateChanged", createStatusMap())
  }

  private fun emitEvent(eventName: String, payload: Any) {
    if (!reactContext.hasActiveReactInstance()) {
      return
    }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }
}
