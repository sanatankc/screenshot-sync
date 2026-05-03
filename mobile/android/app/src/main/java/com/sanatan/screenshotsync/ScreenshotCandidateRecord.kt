package com.sanatan.screenshotsync

data class ScreenshotCandidateRecord(
  val id: String,
  val mediaStoreId: Long,
  val uri: String,
  val fileName: String,
  val relativePath: String,
  val mimeType: String,
  val width: Int,
  val height: Int,
  val capturedAt: Long,
  val detectedAt: Long,
  val sequence: Int,
)
