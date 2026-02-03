"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  MdLogin,
  MdLocationOn,
  MdSecurity,
  MdWarning,
  MdDownload,
  MdClose,
  MdRefresh,
} from "react-icons/md";

import styles from "./styles/ActivityHistorySection.module.css";

import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";
import { profileAdapter } from "@/lib/profileAdapter";

/* ================= TYPES ================= */
type ActivityType = "login" | "location" | "security" | "device" | "system";
type Severity = "info" | "warning" | "critical";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  action: string;
  description?: string | null;
  timestamp: string; // ISO
  severity: Severity;
}

/* ================= HELPERS ================= */
function iconFor(type: ActivityType) {
  switch (type) {
    case "login":
      return <MdLogin />;
    case "location":
      return <MdLocationOn />;
    case "security":
      return <MdSecurity />;
    default:
      return <MdWarning />;
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "Unknown time";
  }
}

function escapeCSV(value: any) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportCSV(rows: ActivityItem[]) {
  const header = ["Time", "Type", "Severity", "Action", "Description"];
  const data = rows.map((a) => [
    a.timestamp,
    a.type,
    a.severity,
    a.action,
    a.description ?? "",
  ]);

  const csv = [header, ...data].map((r) => r.map(escapeCSV).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "activity-log.csv";
  link.click();
}

/* ================= COMPONENT ================= */
export default function ActivityHistorySection() {
  const notify = useNotify();

  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* FILTER STATE */
  const [type, setType] = useState<ActivityType | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState(""); // yyyy-mm-dd

  /* MODAL */
  const [active, setActive] = useState<ActivityItem | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const fetchHistory = useCallback(async () => {
    setError(null);

    try {
      const res = await authFetch(profileAdapter.activityHistory(), {
        method: "GET",
      });

      const raw = await res.json().catch(() => ({}));

      if (!res.ok) {
        setData([]);
        setError(raw?.error || "Failed to load activity history.");
        return;
      }

      const items: ActivityItem[] = Array.isArray(raw?.activities)
        ? raw.activities.map((a: any) => ({
            id: String(a?.id ?? crypto.randomUUID()),
            type: (a?.type ?? "system") as ActivityType,
            action: String(a?.action ?? "Unknown activity"),
            description: a?.description ?? null,
            timestamp: String(a?.timestamp ?? new Date().toISOString()),
            severity: (a?.severity ?? "info") as Severity,
          }))
        : [];

      // newest first
      items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setData(items);
    } catch {
      setData([]);
      setError("Network error while loading activity history.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchHistory();
      setLoading(false);
    })();
  }, [fetchHistory]);

  const filtered = useMemo(() => {
    const fromTime = from ? new Date(from).getTime() : null;

    // ✅ include full "to" day by extending to 23:59:59
    const toTime = to
      ? new Date(`${to}T23:59:59.999`).getTime()
      : null;

    return data.filter((a) => {
      if (type !== "all" && a.type !== type) return false;
      if (severity !== "all" && a.severity !== severity) return false;

      const time = new Date(a.timestamp).getTime();

      if (fromTime !== null && time < fromTime) return false;
      if (toTime !== null && time > toTime) return false;

      return true;
    });
  }, [data, type, severity, from, to]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);

    notify({
      type: "success",
      title: "Updated",
      message: "Activity history refreshed ✅",
      duration: 1500,
    });
  }, [fetchHistory, notify]);

  // ✅ Close modal with ESC
  useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  return (
    <section className={styles.section}>
      <div className={styles.topRow}>
        <div>
          <h3>Activity History</h3>
          <p className={styles.muted}>Security, login, and SOS actions on your account.</p>
        </div>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={refresh}
          disabled={loading || refreshing}
        >
          <MdRefresh /> {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ===== FILTERS ===== */}
      <div className={styles.filters}>
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="all">All Types</option>
          <option value="login">Login</option>
          <option value="security">Security</option>
          <option value="location">Location</option>
          <option value="device">Device</option>
          <option value="system">System</option>
        </select>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as any)}
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>

        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
        >
          <MdDownload /> Export CSV
        </button>
      </div>

      {/* ===== ERROR ===== */}
      {error && <p className={styles.errorText}>{error}</p>}

      {/* ===== LIST ===== */}
      {loading && <p className={styles.muted}>Loading activity…</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className={styles.muted}>No activity found.</p>
      )}

      <div className={styles.activityList}>
        {filtered.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`${styles.activityItem} ${
              a.severity === "warning"
                ? styles.warn
                : a.severity === "critical"
                ? styles.critical
                : ""
            }`}
            onClick={() => setActive(a)}
            aria-label="View activity details"
          >
            <div className={styles.activityIcon}>{iconFor(a.type)}</div>

            <div className={styles.activityContent}>
              <p>{a.action}</p>
              <small>{formatDate(a.timestamp)}</small>
            </div>
          </button>
        ))}
      </div>

      {/* ===== DETAILS MODAL ===== */}
      {active && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActive(null);
          }}
        >
          <div className={styles.modal} ref={modalRef}>
            <header className={styles.modalHeader}>
              <h4>Activity Details</h4>

              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setActive(null)}
                aria-label="Close activity details"
              >
                <MdClose />
              </button>
            </header>

            <p>
              <strong>Action:</strong> {active.action}
            </p>
            <p>
              <strong>Type:</strong> {active.type}
            </p>
            <p>
              <strong>Severity:</strong> {active.severity}
            </p>
            <p>
              <strong>Time:</strong> {formatDate(active.timestamp)}
            </p>

            {active.description && (
              <p>
                <strong>Details:</strong> {active.description}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
