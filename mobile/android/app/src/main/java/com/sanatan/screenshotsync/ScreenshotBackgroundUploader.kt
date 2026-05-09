package com.sanatan.screenshotsync

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class ScreenshotBackgroundUploader(
  private val context: Context,
  private val queueStore: ScreenshotQueueStore,
) {
  companion object {
    private const val TAG = "ScreenshotUploader"
    private const val UPLOAD_NOTIFICATION_CHANNEL_ID = "upload-status"
    private const val UPLOAD_NOTIFICATION_ID = 3108
    private const val REQUEST_TIMEOUT_MS = 20_000
    private const val CONNECT_TIMEOUT_MS = 15_000
  }

  private val notificationManager =
    context.getSystemService(NotificationManager::class.java)

  fun drainQueue() {
    Log.d(TAG, "drainQueue:start")
    val session = queueStore.loadPairedDeviceSession()
    if (session == null) {
      Log.w(TAG, "drainQueue:no_paired_session")
      return
    }

    val items = queueStore.listUploadableItems()
    Log.d(TAG, "drainQueue:loaded_session deviceId=${session.deviceId} workspaceId=${session.workspaceId} serverUrl=${session.serverUrl}")
    Log.d(TAG, "drainQueue:queue_count=${items.size}")
    if (items.isEmpty()) {
      Log.d(TAG, "drainQueue:empty")
      return
    }

    ensureUploadNotificationChannel()
    showUploadStartedNotification(items.size)

    var successCount = 0
    var failureCount = 0

    items.forEach { item ->
      try {
        Log.d(TAG, "drainQueue:item_start id=${item.id} uri=${item.uri} retryCount=${item.retryCount}")
        processQueueItem(session, item)
        successCount += 1
        Log.d(TAG, "drainQueue:item_success id=${item.id}")
      } catch (error: Throwable) {
        failureCount += 1
        Log.e(TAG, "drainQueue:item_failed id=${item.id} message=${error.message}", error)
        queueStore.markFailed(item.id, error.message ?: "UPLOAD_FAILED")
      }
    }

    Log.d(TAG, "drainQueue:finished success=$successCount failure=$failureCount")
    showUploadFinishedNotification(successCount, failureCount)
  }

  private fun processQueueItem(
    session: PairedDeviceSessionRecord,
    item: QueuedScreenshotRecord,
  ) {
    queueStore.markUploading(item.id)
    Log.d(TAG, "processQueueItem:mark_uploading id=${item.id}")

    val mimeType = item.mimeType ?: guessMimeType(item.fileName)
    val screenshotBytes = readScreenshotBytes(item.uri)
    Log.d(TAG, "processQueueItem:file_ready id=${item.id} mimeType=$mimeType size=${screenshotBytes.size}")
    val initResponse = initRemoteScreenshot(session, item, mimeType, screenshotBytes.size)
    Log.d(TAG, "processQueueItem:init_complete id=${item.id} screenshotId=${initResponse.screenshotId}")

    try {
      uploadBytes(initResponse.previewUrl, mimeType, screenshotBytes)
      Log.d(TAG, "processQueueItem:preview_uploaded id=${item.id} screenshotId=${initResponse.screenshotId}")
      completePreviewUpload(session, initResponse.screenshotId, item, mimeType, screenshotBytes.size, initResponse.previewUrl)
      Log.d(TAG, "processQueueItem:preview_complete id=${item.id} screenshotId=${initResponse.screenshotId}")

      uploadBytes(initResponse.originalUrl, mimeType, screenshotBytes)
      Log.d(TAG, "processQueueItem:original_uploaded id=${item.id} screenshotId=${initResponse.screenshotId}")
      completeOriginalUpload(session, initResponse.screenshotId, mimeType, screenshotBytes.size, initResponse.originalUrl)
      Log.d(TAG, "processQueueItem:original_complete id=${item.id} screenshotId=${initResponse.screenshotId}")

      queueStore.markUploaded(item.id)
      Log.d(TAG, "processQueueItem:mark_uploaded id=${item.id}")
    } catch (error: Throwable) {
      Log.e(TAG, "processQueueItem:error id=${item.id} screenshotId=${initResponse.screenshotId} message=${error.message}", error)
      runCatching {
        failRemoteScreenshot(session, initResponse.screenshotId, error.message ?: "UPLOAD_FAILED")
        Log.d(TAG, "processQueueItem:remote_fail_notified id=${item.id} screenshotId=${initResponse.screenshotId}")
      }
      throw error
    }
  }

  private fun initRemoteScreenshot(
    session: PairedDeviceSessionRecord,
    item: QueuedScreenshotRecord,
    mimeType: String,
    fileSizeBytes: Int,
  ): NativeInitResponse {
    Log.d(TAG, "initRemoteScreenshot:request id=${item.id}")
    val payload = JSONObject().apply {
      put("clientGeneratedId", item.id)
      put("capturedAt", item.capturedAt ?: item.detectedAt)
      put("detectedAt", item.detectedAt)
      put("width", item.width ?: 0)
      put("height", item.height ?: 0)
      put("mimeType", mimeType)
      put("fileSizeBytes", fileSizeBytes)
    }

    val responseBody = executeJsonRequest(
      "${normalizeBaseUrl(session.serverUrl)}/api/screenshots/init",
      "POST",
      payload.toString(),
      session.deviceToken,
    )

    val json = JSONObject(responseBody)
    val uploadTargets = json.getJSONObject("uploadTargets")
    Log.d(TAG, "initRemoteScreenshot:response id=${item.id} screenshotId=${json.getString("screenshotId")}")
    return NativeInitResponse(
      screenshotId = json.getString("screenshotId"),
      previewUrl = uploadTargets.getJSONObject("preview").getString("url"),
      originalUrl = uploadTargets.getJSONObject("original").getString("url"),
    )
  }

  private fun completePreviewUpload(
    session: PairedDeviceSessionRecord,
    screenshotId: String,
    item: QueuedScreenshotRecord,
    mimeType: String,
    fileSizeBytes: Int,
    uploadUrl: String,
  ) {
    Log.d(TAG, "completePreviewUpload:request screenshotId=$screenshotId")
    val payload = JSONObject().apply {
      put("storageKey", extractStorageKey(uploadUrl))
      put("mimeType", mimeType)
      put("sizeBytes", fileSizeBytes)
      put("width", item.width ?: 0)
      put("height", item.height ?: 0)
      put("blurhash", JSONObject.NULL)
    }

    executeJsonRequest(
      "${normalizeBaseUrl(session.serverUrl)}/api/screenshots/$screenshotId/preview",
      "POST",
      payload.toString(),
      session.deviceToken,
      expectBody = false,
    )
    Log.d(TAG, "completePreviewUpload:done screenshotId=$screenshotId")
  }

  private fun completeOriginalUpload(
    session: PairedDeviceSessionRecord,
    screenshotId: String,
    mimeType: String,
    fileSizeBytes: Int,
    uploadUrl: String,
  ) {
    Log.d(TAG, "completeOriginalUpload:request screenshotId=$screenshotId")
    val payload = JSONObject().apply {
      put("storageKey", extractStorageKey(uploadUrl))
      put("mimeType", mimeType)
      put("sizeBytes", fileSizeBytes)
    }

    executeJsonRequest(
      "${normalizeBaseUrl(session.serverUrl)}/api/screenshots/$screenshotId/original",
      "POST",
      payload.toString(),
      session.deviceToken,
      expectBody = false,
    )
    Log.d(TAG, "completeOriginalUpload:done screenshotId=$screenshotId")
  }

  private fun failRemoteScreenshot(
    session: PairedDeviceSessionRecord,
    screenshotId: String,
    reason: String,
  ) {
    Log.d(TAG, "failRemoteScreenshot:request screenshotId=$screenshotId reason=$reason")
    val payload = JSONObject().apply {
      put("reason", reason)
    }

    executeJsonRequest(
      "${normalizeBaseUrl(session.serverUrl)}/api/screenshots/$screenshotId/fail",
      "POST",
      payload.toString(),
      session.deviceToken,
      expectBody = false,
    )
    Log.d(TAG, "failRemoteScreenshot:done screenshotId=$screenshotId")
  }

  private fun uploadBytes(url: String, mimeType: String, bytes: ByteArray) {
    Log.d(TAG, "uploadBytes:start url=$url size=${bytes.size} mimeType=$mimeType")
    val connection = openConnection(url)
    connection.requestMethod = "PUT"
    connection.doOutput = true
    connection.setRequestProperty("content-type", mimeType)
    connection.setFixedLengthStreamingMode(bytes.size)

    try {
      BufferedOutputStream(connection.outputStream).use { output ->
        output.write(bytes)
        output.flush()
      }

      val status = connection.responseCode
      if (status !in 200..299) {
        val body = readResponseBody(connection)
        throw IOException("UPLOAD_FAILED_$status${if (body.isNotBlank()) ":$body" else ""}")
      }
      Log.d(TAG, "uploadBytes:done url=$url status=$status")
    } finally {
      connection.disconnect()
    }
  }

  private fun executeJsonRequest(
    url: String,
    method: String,
    body: String,
    deviceToken: String,
    expectBody: Boolean = true,
  ): String {
    Log.d(TAG, "executeJsonRequest:start method=$method url=$url")
    val connection = openConnection(url)
    connection.requestMethod = method
    connection.doOutput = true
    connection.setRequestProperty("authorization", "Bearer $deviceToken")
    connection.setRequestProperty("content-type", "application/json")

    try {
      BufferedOutputStream(connection.outputStream).use { output ->
        output.write(body.toByteArray(Charsets.UTF_8))
        output.flush()
      }

      val status = connection.responseCode
      val responseBody = readResponseBody(connection)

      if (status !in 200..299) {
        throw IOException("${method}_FAILED_$status${if (responseBody.isNotBlank()) ":$responseBody" else ""}")
      }

      Log.d(TAG, "executeJsonRequest:done method=$method url=$url status=$status")
      return if (expectBody) responseBody else ""
    } finally {
      connection.disconnect()
    }
  }

  private fun openConnection(url: String): HttpURLConnection {
    return (URL(url).openConnection() as HttpURLConnection).apply {
      connectTimeout = CONNECT_TIMEOUT_MS
      readTimeout = REQUEST_TIMEOUT_MS
      useCaches = false
    }
  }

  private fun readResponseBody(connection: HttpURLConnection): String {
    val stream = try {
      connection.inputStream
    } catch (_: Throwable) {
      connection.errorStream
    } ?: return ""

    return stream.bufferedReader().use { it.readText() }
  }

  private fun readScreenshotBytes(uriValue: String): ByteArray {
    Log.d(TAG, "readScreenshotBytes:start uri=$uriValue")
    val inputStream = context.contentResolver.openInputStream(Uri.parse(uriValue))
      ?: throw IOException("QUEUE_ITEM_NOT_READABLE")

    inputStream.use { rawStream ->
      BufferedInputStream(rawStream).use { input ->
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        while (true) {
          val read = input.read(buffer)
          if (read == -1) {
            break
          }
          output.write(buffer, 0, read)
        }
        val bytes = output.toByteArray()
        Log.d(TAG, "readScreenshotBytes:done uri=$uriValue size=${bytes.size}")
        return bytes
      }
    }
  }

  private fun normalizeBaseUrl(serverUrl: String): String {
    return serverUrl.removeSuffix("/")
  }

  private fun extractStorageKey(uploadUrl: String): String {
    return URL(uploadUrl).path.removePrefix("/internal/uploads/")
  }

  private fun guessMimeType(fileName: String): String {
    val lower = fileName.lowercase()
    return when {
      lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
      lower.endsWith(".webp") -> "image/webp"
      else -> "image/png"
    }
  }

  private fun ensureUploadNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel = NotificationChannel(
      UPLOAD_NOTIFICATION_CHANNEL_ID,
      "Upload status",
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = "Screenshot upload progress and completion updates"
    }

    notificationManager.createNotificationChannel(channel)
  }

  private fun showUploadStartedNotification(count: Int) {
    notificationManager.notify(
      UPLOAD_NOTIFICATION_ID,
      NotificationCompat.Builder(context, UPLOAD_NOTIFICATION_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_menu_upload)
        .setContentTitle(if (count == 1) "Uploading screenshot" else "Uploading $count screenshots")
        .setContentText("Screenshot Sync is sending new captures in the background.")
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .build(),
    )
  }

  private fun showUploadFinishedNotification(successCount: Int, failureCount: Int) {
    val title = when {
      failureCount > 0 && successCount > 0 -> "Uploaded $successCount, $failureCount failed"
      failureCount > 0 -> "Upload failed for $failureCount"
      successCount == 1 -> "Uploaded 1 screenshot"
      else -> "Uploaded $successCount screenshots"
    }

    val body = if (failureCount > 0) {
      "We will retry failed screenshots automatically."
    } else {
      "Your latest screenshots have been synced."
    }

    notificationManager.notify(
      UPLOAD_NOTIFICATION_ID,
      NotificationCompat.Builder(context, UPLOAD_NOTIFICATION_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_menu_upload)
        .setContentTitle(title)
        .setContentText(body)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .build(),
    )
  }
}

private data class NativeInitResponse(
  val screenshotId: String,
  val previewUrl: String,
  val originalUrl: String,
)
