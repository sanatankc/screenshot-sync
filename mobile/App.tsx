import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ensureScreenshotPermission,
  getScreenshotDetectorStatus,
  isScreenshotDetectorAvailable,
  startScreenshotDetection,
  stopScreenshotDetection,
  subscribeToDetectorState,
  subscribeToScreenshotDetections,
  type ScreenshotCandidate,
  type ScreenshotDetectorStatus,
} from "./src/detection/screenshotDetector";
import { ensureAppStorage, loadBootstrapDiagnostics, type BootstrapDiagnostics } from "./src/storage/bootstrap";

const DEFAULT_DIAGNOSTICS: BootstrapDiagnostics = {
  queueTableReady: false,
  databasePath: "unavailable",
  lastCheckedAt: null,
};

const sampleQueue = [
  { id: "demo-1", name: "Screenshot_2026-05-03-18-01-44.png", state: "queued" },
  { id: "demo-2", name: "Screenshot_2026-05-03-18-04-10.png", state: "uploaded" },
];

const DEFAULT_DETECTOR_STATUS: ScreenshotDetectorStatus = {
  isWatching: false,
  listenerCount: 0,
  seenItemCount: 0,
  platform: "unknown",
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<BootstrapDiagnostics>(DEFAULT_DIAGNOSTICS);
  const [detectorStatus, setDetectorStatus] = useState<ScreenshotDetectorStatus>(DEFAULT_DETECTOR_STATUS);
  const [permissionState, setPermissionState] = useState<"unknown" | "granted" | "denied">("unknown");
  const [detectedScreenshots, setDetectedScreenshots] = useState<ScreenshotCandidate[]>([]);
  const detectorAvailable = isScreenshotDetectorAvailable();

  async function refreshDiagnostics() {
    try {
      setError(null);
      await ensureAppStorage();
      setDiagnostics(await loadBootstrapDiagnostics());
      setDetectorStatus(await getScreenshotDetectorStatus());
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message || "Failed to initialize local storage");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartDetector() {
    const granted = await ensureScreenshotPermission();
    setPermissionState(granted ? "granted" : "denied");
    if (!granted) {
      return;
    }
    setDetectorStatus(await startScreenshotDetection());
  }

  async function handleStopDetector() {
    setDetectorStatus(await stopScreenshotDetection());
  }

  useEffect(() => {
    void refreshDiagnostics();
  }, []);

  useEffect(() => {
    const screenshotSubscription = subscribeToScreenshotDetections((candidate) => {
      setDetectedScreenshots((current) => [candidate, ...current].slice(0, 12));
    });
    const stateSubscription = subscribeToDetectorState((status) => {
      setDetectorStatus(status);
    });

    return () => {
      screenshotSubscription.remove();
      stateSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Android Prototype</Text>
          <Text style={styles.title}>Screenshot Sync</Text>
          <Text style={styles.subtitle}>
            Bootstrapped shell for MediaStore detection, upload queueing, and background sync.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bootstrap status</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#d3ff75" />
              <Text style={styles.loadingText}>Preparing local storage and debug surface...</Text>
            </View>
          ) : null}
          {error ? (
            <View style={[styles.card, styles.errorCard]}>
              <Text style={styles.errorLabel}>Initialization failed</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {!loading && !error ? (
            <View style={styles.card}>
              <Row label="Queue table" value={diagnostics.queueTableReady ? "ready" : "missing"} />
              <Row label="Database path" value={diagnostics.databasePath} />
              <Row label="Last checked" value={diagnostics.lastCheckedAt ?? "just now"} />
            </View>
          ) : null}
          <Pressable style={styles.button} onPress={() => void refreshDiagnostics()}>
            <Text style={styles.buttonText}>Refresh bootstrap check</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screenshot detector</Text>
          <View style={styles.card}>
            <Row label="Native module" value={detectorAvailable ? "available" : "missing"} />
            <Row label="Watching" value={detectorStatus.isWatching ? "yes" : "no"} />
            <Row label="Seen screenshots" value={String(detectorStatus.seenItemCount)} />
            <Row label="Permission" value={permissionState} />
            <View style={styles.actionRow}>
              <Pressable style={[styles.button, styles.actionButton]} onPress={() => void handleStartDetector()}>
                <Text style={styles.buttonText}>Start detector</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.actionButton, styles.secondaryButton]}
                onPress={() => void handleStopDetector()}
              >
                <Text style={styles.secondaryButtonText}>Stop</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next milestones</Text>
          <View style={styles.card}>
            <Milestone title="Native detector" body="Add a Kotlin module that emits new screenshot candidates from MediaStore." />
            <Milestone title="Persistent queue" body="Track queued, uploading, uploaded, and failed screenshots in SQLite." />
            <Milestone title="Background worker" body="Move uploads out of the UI path and reconcile missed screenshots later." />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected screenshots</Text>
          <View style={styles.card}>
            {detectedScreenshots.length === 0 ? (
              <Text style={styles.emptyText}>Start the detector and take a screenshot on the device.</Text>
            ) : (
              detectedScreenshots.map((item) => (
                <View key={item.id} style={styles.queueItem}>
                  <View style={styles.queueText}>
                    <Text style={styles.queueName}>{item.fileName}</Text>
                    <Text style={styles.queueId}>{item.relativePath || item.uri}</Text>
                  </View>
                  <Text style={styles.queueState}>#{item.sequence}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample queue preview</Text>
          <View style={styles.card}>
            {sampleQueue.map((item) => (
              <View key={item.id} style={styles.queueItem}>
                <View style={styles.queueText}>
                  <Text style={styles.queueName}>{item.name}</Text>
                  <Text style={styles.queueId}>{item.id}</Text>
                </View>
                <Text style={styles.queueState}>{item.state}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Milestone({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.milestone}>
      <Text style={styles.milestoneTitle}>{title}</Text>
      <Text style={styles.milestoneBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090b10",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    color: "#d3ff75",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#f4f7fb",
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#98a3b3",
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: "#f4f7fb",
    fontSize: 18,
    fontWeight: "700",
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  loadingText: {
    color: "#98a3b3",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#10141d",
    borderColor: "#1d2531",
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  errorCard: {
    borderColor: "#61383b",
  },
  errorLabel: {
    color: "#ffb3b8",
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: "#e8a4aa",
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  rowLabel: {
    color: "#98a3b3",
    fontSize: 14,
  },
  rowValue: {
    color: "#f4f7fb",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#d3ff75",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#090b10",
    fontSize: 14,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: "#151b24",
    borderColor: "#263143",
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: "#f4f7fb",
    fontSize: 14,
    fontWeight: "700",
  },
  milestone: {
    gap: 6,
  },
  milestoneTitle: {
    color: "#f4f7fb",
    fontSize: 15,
    fontWeight: "700",
  },
  milestoneBody: {
    color: "#98a3b3",
    fontSize: 14,
    lineHeight: 20,
  },
  queueItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  queueText: {
    flex: 1,
    gap: 4,
  },
  queueName: {
    color: "#f4f7fb",
    fontSize: 14,
    fontWeight: "600",
  },
  queueId: {
    color: "#6f7c8f",
    fontSize: 12,
  },
  queueState: {
    color: "#d3ff75",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  emptyText: {
    color: "#98a3b3",
    fontSize: 14,
    lineHeight: 20,
  },
});
