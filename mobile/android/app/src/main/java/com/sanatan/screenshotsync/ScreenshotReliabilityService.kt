package com.sanatan.screenshotsync

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import androidx.core.app.NotificationCompat
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ScreenshotReliabilityService : Service() {
  companion object {
    private const val NOTIFICATION_CHANNEL_ID = "screenshot-sync-reliability"
    private const val NOTIFICATION_ID = 3107
    private const val ACTION_START = "com.sanatan.screenshotsync.action.START_RELIABILITY"
    private const val ACTION_STOP = "com.sanatan.screenshotsync.action.STOP_RELIABILITY"
    private const val PREFS_NAME = "screenshot_sync_reliability"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_LAST_SCAN_AT = "last_scan_at"
    private const val RECONCILIATION_INTERVAL_MS = 15 * 60 * 1000L
    @Volatile
    private var serviceRunning = false

    fun start(context: Context) {
      val intent = Intent(context, ScreenshotReliabilityService::class.java).apply {
        action = ACTION_START
      }
      androidx.core.content.ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      val intent = Intent(context, ScreenshotReliabilityService::class.java).apply {
        action = ACTION_STOP
      }
      context.startService(intent)
    }

    fun isEnabled(context: Context): Boolean {
      return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)
    }

    fun getLastScanAt(context: Context): Long {
      return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getLong(KEY_LAST_SCAN_AT, 0L)
    }

    fun isRunning(): Boolean = serviceRunning

    private fun setEnabled(context: Context, enabled: Boolean) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, enabled).apply()
    }

    private fun setLastScanAt(context: Context, timestamp: Long) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putLong(KEY_LAST_SCAN_AT, timestamp).apply()
    }
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private lateinit var scanner: ScreenshotScanner
  private lateinit var queueStore: ScreenshotQueueStore
  private lateinit var executor: ExecutorService
  private var observer: ContentObserver? = null
  private var isRunning = false

  private val reconciliationRunnable = object : Runnable {
    override fun run() {
      runReconciliationScan()
      if (isRunning) {
        mainHandler.postDelayed(this, RECONCILIATION_INTERVAL_MS)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    scanner = ScreenshotScanner(this)
    queueStore = ScreenshotQueueStore(this)
    executor = Executors.newSingleThreadExecutor()
    createNotificationChannel()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopReliabilityMode()
        return START_NOT_STICKY
      }
      ACTION_START, null -> startReliabilityMode()
    }

    return START_STICKY
  }

  override fun onDestroy() {
    serviceRunning = false
    teardownObservers()
    executor.shutdownNow()
    super.onDestroy()
  }

  private fun startReliabilityMode() {
    if (isRunning) {
      return
    }

    setEnabled(this, true)
    startForeground(NOTIFICATION_ID, createNotification())
    registerObserver()
    isRunning = true
    serviceRunning = true
    runLiveScan()
    mainHandler.removeCallbacks(reconciliationRunnable)
    mainHandler.postDelayed(reconciliationRunnable, RECONCILIATION_INTERVAL_MS)
  }

  private fun stopReliabilityMode() {
    setEnabled(this, false)
    isRunning = false
    serviceRunning = false
    mainHandler.removeCallbacks(reconciliationRunnable)
    teardownObservers()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun registerObserver() {
    if (observer != null) {
      return
    }

    observer = object : ContentObserver(mainHandler) {
      override fun onChange(selfChange: Boolean) {
        super.onChange(selfChange)
        runLiveScan()
      }
    }

    contentResolver.registerContentObserver(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      true,
      observer as ContentObserver,
    )
  }

  private fun teardownObservers() {
    observer?.let { contentResolver.unregisterContentObserver(it) }
    observer = null
    mainHandler.removeCallbacks(reconciliationRunnable)
  }

  private fun runLiveScan() {
    executor.execute {
      persistCandidates(scanner.scanRecentScreenshots())
    }
  }

  private fun runReconciliationScan() {
    executor.execute {
      persistCandidates(scanner.reconcileRecentScreenshots())
    }
  }

  private fun persistCandidates(candidates: List<ScreenshotCandidateRecord>) {
    candidates.forEach { candidate ->
      queueStore.enqueueCandidate(candidate)
    }
    setLastScanAt(this, System.currentTimeMillis())
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      NOTIFICATION_CHANNEL_ID,
      "Screenshot Sync",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Keeps screenshot detection running in the background"
    }

    manager.createNotificationChannel(channel)
  }

  private fun createNotification(): Notification {
    return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_menu_upload)
      .setContentTitle("Screenshot Sync is running")
      .setContentText("Max reliability mode keeps screenshot detection active.")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }
}
