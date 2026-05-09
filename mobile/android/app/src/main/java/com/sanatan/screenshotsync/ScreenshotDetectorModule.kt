package com.sanatan.screenshotsync

import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenshotDetectorModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    private const val TAG = "ScreenshotModule"
  }

  private var contentObserver: ContentObserver? = null
  private var isWatching = false
  private var listenerCount = 0
  private val seenMediaIds = LinkedHashSet<Long>()
  private val scanner = ScreenshotScanner(reactContext)
  private val queueStore = ScreenshotQueueStore(reactContext)

  override fun getName(): String = "ScreenshotDetector"

  @ReactMethod
  fun startWatching(promise: Promise) {
    Log.d(TAG, "startWatching called isWatching=$isWatching")
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
    Log.d(TAG, "startWatching registered observer")
    sendDetectorStateChanged()
    scanForRecentScreenshots()
    promise.resolve(createStatusMap())
  }

  @ReactMethod
  fun stopWatching(promise: Promise) {
    Log.d(TAG, "stopWatching called")
    unregisterObserver()
    promise.resolve(createStatusMap())
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve(createStatusMap())
  }

  @ReactMethod
  fun startReliabilityMode(promise: Promise) {
    Log.d(TAG, "startReliabilityMode called")
    ScreenshotReliabilityService.start(reactContext)
    val status = createReliabilityStatusMap()
    Log.d(TAG, "startReliabilityMode returning enabled=${status.getBoolean("enabled")} serviceRunning=${status.getBoolean("serviceRunning")}")
    promise.resolve(status)
  }

  @ReactMethod
  fun syncPairedSession(session: ReadableMap, promise: Promise) {
    try {
      val record = PairedDeviceSessionRecord(
        workspaceId = session.getString("workspaceId") ?: throw IllegalArgumentException("workspaceId missing"),
        deviceId = session.getString("deviceId") ?: throw IllegalArgumentException("deviceId missing"),
        deviceToken = session.getString("deviceToken") ?: throw IllegalArgumentException("deviceToken missing"),
        serverUrl = session.getString("serverUrl") ?: throw IllegalArgumentException("serverUrl missing"),
        connectedAt = session.getString("connectedAt") ?: throw IllegalArgumentException("connectedAt missing"),
      )
      queueStore.savePairedDeviceSession(record)
      Log.d(TAG, "syncPairedSession saved deviceId=${record.deviceId}")
      promise.resolve(null)
    } catch (error: Throwable) {
      Log.e(TAG, "syncPairedSession failed message=${error.message}", error)
      promise.reject("SYNC_PAIRED_SESSION_FAILED", error)
    }
  }

  @ReactMethod
  fun clearPairedSession(promise: Promise) {
    try {
      queueStore.clearPairedDeviceSession()
      Log.d(TAG, "clearPairedSession done")
      promise.resolve(null)
    } catch (error: Throwable) {
      Log.e(TAG, "clearPairedSession failed message=${error.message}", error)
      promise.reject("CLEAR_PAIRED_SESSION_FAILED", error)
    }
  }

  @ReactMethod
  fun stopReliabilityMode(promise: Promise) {
    Log.d(TAG, "stopReliabilityMode called")
    ScreenshotReliabilityService.stop(reactContext)
    val status = createReliabilityStatusMap()
    Log.d(TAG, "stopReliabilityMode returning enabled=${status.getBoolean("enabled")} serviceRunning=${status.getBoolean("serviceRunning")}")
    promise.resolve(status)
  }

  @ReactMethod
  fun getReliabilityStatus(promise: Promise) {
    promise.resolve(createReliabilityStatusMap())
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
    Log.d(TAG, "unregisterObserver")
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

  private fun createReliabilityStatusMap(): ReadableMap {
    val map = Arguments.createMap()
    map.putBoolean("enabled", ScreenshotReliabilityService.isEnabled(reactContext))
    map.putBoolean("serviceRunning", ScreenshotReliabilityService.isRunning())
    map.putDouble("lastScanAt", ScreenshotReliabilityService.getLastScanAt(reactContext).toDouble())
    map.putString("platform", "android")
    return map
  }

  private fun scanForRecentScreenshots() {
    val candidates = scanner.scanRecentScreenshots()
    Log.d(TAG, "scanForRecentScreenshots candidates=${candidates.size}")
    candidates.forEach { candidate ->
      if (seenMediaIds.contains(candidate.mediaStoreId)) {
        return@forEach
      }

      seenMediaIds.add(candidate.mediaStoreId)
      trimSeenIds()

      val payload = Arguments.createMap().apply {
        putString("id", candidate.id)
        putString("mediaStoreId", candidate.mediaStoreId.toString())
        putString("uri", candidate.uri)
        putString("fileName", candidate.fileName)
        putString("relativePath", candidate.relativePath)
        putString("mimeType", candidate.mimeType)
        putInt("width", candidate.width)
        putInt("height", candidate.height)
        putDouble("capturedAt", candidate.capturedAt.toDouble())
        putDouble("detectedAt", candidate.detectedAt.toDouble())
        putInt("sequence", candidate.sequence)
      }

      emitEvent("onScreenshotDetected", payload)
    }
  }

  private fun trimSeenIds() {
    while (seenMediaIds.size > 256) {
      val first = seenMediaIds.firstOrNull() ?: return
      seenMediaIds.remove(first)
    }
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
