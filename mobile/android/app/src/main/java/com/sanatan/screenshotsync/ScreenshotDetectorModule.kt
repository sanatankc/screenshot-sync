package com.sanatan.screenshotsync

import android.database.ContentObserver
import android.net.Uri
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
class ScreenshotDetectorModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var contentObserver: ContentObserver? = null
  private var isWatching = false
  private var listenerCount = 0
  private val seenMediaIds = LinkedHashSet<Long>()
  private val scanner = ScreenshotScanner(reactContext)

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
  fun startReliabilityMode(promise: Promise) {
    ScreenshotReliabilityService.start(reactContext)
    promise.resolve(createReliabilityStatusMap())
  }

  @ReactMethod
  fun stopReliabilityMode(promise: Promise) {
    ScreenshotReliabilityService.stop(reactContext)
    promise.resolve(createReliabilityStatusMap())
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
    scanner.scanRecentScreenshots().forEach { candidate ->
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
