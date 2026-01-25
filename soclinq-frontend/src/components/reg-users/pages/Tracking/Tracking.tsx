"use client";

import { useState, useCallback } from "react";
import styles from "./styles/Tracking.module.css";

/* ================= ICONS ================= */
import {
  FiCpu,
  FiAlertTriangle,
  FiActivity,
  FiLoader,
} from "react-icons/fi";
import { MdLocationOn, MdReportProblem } from "react-icons/md";
import { HiSignal, HiSignalSlash } from "react-icons/hi2";
import { join } from "path";

/* ================= TYPES ================= */
type Device = {
  deviceId: string;
  imei: string;
  sim: string;
  model: string;
};

type Location = {
  lat: number;
  lng: number;
  ts: number;
};

type TrackingStatus = "idle" | "registered" | "tracking" | "missing";

/* ================= PLACEHOLDER API ================= */
const api = {
  registerDevice: async (device: Device) => {
    await new Promise(r => setTimeout(r, 800));
    return { success: true };
  },

  sendLocation: async (deviceId: string, lat: number, lng: number) => {
    await new Promise(r => setTimeout(r, 300));
    return { lat, lng, ts: Date.now() };
  },

  reportMissing: async (deviceId: string) => {
    await new Promise(r => setTimeout(r, 600));
    return { success: true };
  },
};

/* ================= COMPONENT ================= */
export default function Tracking() {
  const [device, setDevice] = useState<Device>({
    deviceId: "",
    imei: "",
    sim: "",
    model: "",
  });

  const [location, setLocation] = useState<Location | null>(null);
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= HELPERS ================= */
  const updateDevice = (key: keyof Device, value: string) =>
    setDevice(prev => ({ ...prev, [key]: value }));

  /* ================= ACTIONS ================= */
  const registerDevice = async () => {
    setError(null);

    if (!device.deviceId || !device.imei) {
      setError("Device ID and IMEI are required.");
      return;
    }

    try {
      setLoading(true);
      await api.registerDevice(device);
      setStatus("registered");
    } catch {
      setError("Failed to register device.");
    } finally {
      setLoading(false);
    }
  };

  const simulateLocation = useCallback(async () => {
    if (!device.deviceId) return;

    const lat = 6.45 + Math.random() * 0.05;
    const lng = 3.38 + Math.random() * 0.05;

    try {
      const res = await api.sendLocation(device.deviceId, lat, lng);
      setLocation(res);
      setStatus("tracking");
    } catch {
      setError("Failed to update location.");
    }
  }, [device.deviceId]);

  const reportMissing = async () => {
    if (!device.deviceId) return;

    try {
      setLoading(true);
      await api.reportMissing(device.deviceId);
      setStatus("missing");
    } catch {
      setError("Failed to report missing device.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */
  return (
    <section className={styles.tracking}>
      {/* ================= HEADER ================= */}
      <header className={styles.trheader}>
        <FiCpu className={styles.headerIcon} />
        <div>
          <h1>Device Tracking</h1>
          <p>Register devices, monitor movement, and handle emergencies</p>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <FiAlertTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* ================= REGISTER ================= */}
      <div className={styles.panel}>
        <h3>
          <FiCpu /> Register Device
        </h3>

        <div className={styles.formGrid}>
          <input
            placeholder="Device ID"
            value={device.deviceId}
            onChange={e => updateDevice("deviceId", e.target.value)}
          />
          <input
            placeholder="IMEI"
            value={device.imei}
            onChange={e => updateDevice("imei", e.target.value)}
          />
          <input
            placeholder="SIM Number"
            value={device.sim}
            onChange={e => updateDevice("sim", e.target.value)}
          />
          <input
            placeholder="Device Model"
            value={device.model}
            onChange={e => updateDevice("model", e.target.value)}
          />
        </div>

        <button onClick={registerDevice} disabled={loading} className={styles.btn}>
          {loading ? <FiLoader className={styles.spin} /> : <FiActivity />}
          <span>{loading ? "Registering..." : "Register Device"}</span>
        </button>
      </div>

      {/* ================= LIVE LOCATION ================= */}
      <div className={styles.panel}>
        <h3>
          <MdLocationOn /> Live Location
        </h3>

        {location ? (
          <div className={styles.location}>
            <p>
              <strong>Latitude:</strong> {location.lat.toFixed(5)}
            </p>
            <p>
              <strong>Longitude:</strong> {location.lng.toFixed(5)}
            </p>
            <span className={styles.ts}>
              Last update: {new Date(location.ts).toLocaleTimeString()}
            </span>
          </div>
        ) : (
          <p className={styles.helper}>
            <HiSignalSlash /> No live data received yet.
          </p>
        )}

        <button
          onClick={simulateLocation}
          className={styles.btn}
          disabled={status === "idle" || loading}
        >
          <HiSignal />
          <span>Simulate Location</span>
        </button>
      </div>

      {/* ================= EMERGENCY ================= */}
      <div className={styles.panel}>
        <h3>
          <FiAlertTriangle /> Emergency
        </h3>

        <button
          className={[styles.danger, styles.btn].join(" ")}
          onClick={reportMissing}
          disabled={loading || status === "missing"}
        >
          <MdReportProblem />
          <span>
            {status === "missing"
              ? "Device Marked as Missing"
              : "Report Device Missing"}
          </span>
        </button>
      </div>

      {/* ================= STATUS ================= */}
      <footer className={styles.status}>
        {status === "tracking" && <HiSignal />}
        {status === "idle" && <HiSignalSlash />}
        {status === "missing" && <FiAlertTriangle />}

        <span>Status:</span>
        <strong data-status={status}>{status.toUpperCase()}</strong>
      </footer>
    </section>
  );
}
