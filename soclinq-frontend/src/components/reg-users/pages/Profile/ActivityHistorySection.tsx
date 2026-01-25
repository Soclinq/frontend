"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MdLogin,
  MdLocationOn,
  MdSecurity,
  MdWarning,
  MdDownload,
  MdClose,
} from "react-icons/md";
import { useUser } from "@/context/UserContext";
import styles from "./styles/ActivityHistorySection.module.css";

/* ================= TYPES ================= */
type ActivityType =
  | "login"
  | "location"
  | "security"
  | "device"
  | "system";

type Severity = "info" | "warning" | "critical";

interface ActivityItem {
  id: string;
  type: ActivityType;
  action: string;
  description?: string;
  timestamp: string; // ISO
  severity: Severity;
}

/* ================= PLACEHOLDER FETCH ================= */
async function fetchActivityHistory(): Promise<ActivityItem[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve([
        {
          id: "1",
          type: "login",
          action: "Login from new device",
          description: "Chrome on Linux • IP: 102.xxx.xxx.xx",
          timestamp: new Date().toISOString(),
          severity: "warning",
        },
        {
          id: "2",
          type: "security",
          action: "Password changed",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          severity: "info",
        },
        {
          id: "3",
          type: "location",
          action: "Live location shared",
          description: "Shared with emergency contact",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          severity: "critical",
        },
      ]);
    }, 700)
  );
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

function exportCSV(data: ActivityItem[]) {
  const rows = [
    ["Time", "Type", "Severity", "Action"],
    ...data.map((a) => [
      a.timestamp,
      a.type,
      a.severity,
      `"${a.action}"`,
    ]),
  ];

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "activity-log.csv";
  link.click();
}

/* ================= COMPONENT ================= */
export default function ActivityHistorySection() {
  const { user } = useUser(); // ✅ READ-ONLY (future userId scoping)

  /* ===== LOCAL STATE ===== */
  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* FILTER STATE */
  const [type, setType] = useState<ActivityType | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* MODAL */
  const [active, setActive] = useState<ActivityItem | null>(null);

  /* ================= FETCH ================= */
  useEffect(() => {
    let mounted = true;

    // later you can pass user.id here
    fetchActivityHistory().then((res) => {
      if (!mounted) return;
      setData(res);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [user]); // user dependency for future-proofing

  /* ================= FILTER LOGIC ================= */
  const filtered = useMemo(() => {
    return data.filter((a) => {
      if (type !== "all" && a.type !== type) return false;
      if (severity !== "all" && a.severity !== severity) return false;

      const time = new Date(a.timestamp).getTime();
      if (from && time < new Date(from).getTime()) return false;
      if (to && time > new Date(to).getTime()) return false;

      return true;
    });
  }, [data, type, severity, from, to]);

  return (
    <section className={styles.section}>
      <h3>Activity History</h3>

      {/* ===== FILTERS ===== */}
      <div className={styles.filters}>
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="all">All Types</option>
          <option value="login">Login</option>
          <option value="security">Security</option>
          <option value="location">Location</option>
          <option value="device">Device</option>
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

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <button
          className={styles.secondaryBtn}
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
        >
          <MdDownload /> Export CSV
        </button>
      </div>

      {/* ===== LIST ===== */}
      {loading && <p className={styles.muted}>Loading activity…</p>}

      {!loading && filtered.length === 0 && (
        <p className={styles.muted}>No activity found.</p>
      )}

      <div className={styles.activityList}>
        {filtered.map((a) => (
          <button
            key={a.id}
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
            <div className={styles.activityIcon}>
              {iconFor(a.type)}
            </div>

            <div className={styles.activityContent}>
              <p>{a.action}</p>
              <small>{formatDate(a.timestamp)}</small>
            </div>
          </button>
        ))}
      </div>

      {/* ===== DETAILS MODAL ===== */}
      {active && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h4>Activity Details</h4>
              <button onClick={() => setActive(null)}>
                <MdClose />
              </button>
            </header>

            <p><strong>Action:</strong> {active.action}</p>
            <p><strong>Type:</strong> {active.type}</p>
            <p><strong>Severity:</strong> {active.severity}</p>
            <p><strong>Time:</strong> {formatDate(active.timestamp)}</p>

            {active.description && (
              <p><strong>Details:</strong> {active.description}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
