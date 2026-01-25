"use client";

import { useEffect, useState } from "react";
import {
  MdGpsFixed,
  MdGpsOff,
  MdLocationOn,
  MdWarning,
} from "react-icons/md";
import { useUser } from "@/context/UserContext";
import styles from "./styles/DeviceTracking.module.css";

/* ================= PLACEHOLDER API ================= */
async function updateDeviceSettings(
  data: Partial<{
    trackingEnabled: boolean;
    locationEnabled: boolean;
  }>
): Promise<boolean> {
  // simulate backend delay
  return new Promise((resolve) =>
    setTimeout(() => resolve(true), 700)
  );
}

/* ================= COMPONENT ================= */
export default function DeviceTrackingSection() {
  const { user } = useUser(); // ✅ READ ONLY

  /* ===== LOCAL STATE (SOURCE OF TRUTH HERE) ===== */
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(
    user?.trackingEnabled
  );
  const [locationEnabled, setLocationEnabled] = useState<boolean>(
    user?.locationEnabled
  );
  const [saving, setSaving] = useState(false);

  const [locationPermission, setLocationPermission] =
    useState<PermissionState | "unsupported">("prompt");

  /* ================= SYNC IF USER CHANGES ================= */
  useEffect(() => {
    setTrackingEnabled(user?.trackingEnabled);
    setLocationEnabled(user?.locationEnabled);
  }, [user?.trackingEnabled, user?.locationEnabled]);

  /* ================= CHECK LOCATION PERMISSION ================= */
  useEffect(() => {
    if (!("permissions" in navigator)) {
      setLocationPermission("unsupported");
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((res) => {
        setLocationPermission(res.state);
        res.onchange = () => setLocationPermission(res.state);
      })
      .catch(() => setLocationPermission("unsupported"));
  }, []);

  /* ================= TOGGLE (OPTIMISTIC + ROLLBACK) ================= */
  const toggle = async (
    key: "trackingEnabled" | "locationEnabled",
    value: boolean
  ) => {
    if (key === "trackingEnabled" && !value) {
      const ok = confirm(
        "Disabling device tracking may reduce SOS and safety features. Continue?"
      );
      if (!ok) return;
    }

    setSaving(true);

    // snapshot for rollback
    const prevTracking = trackingEnabled;
    const prevLocation = locationEnabled;

    // optimistic UI
    if (key === "trackingEnabled") setTrackingEnabled(value);
    if (key === "locationEnabled") setLocationEnabled(value);

    const success = await updateDeviceSettings({ [key]: value });

    if (!success) {
      // rollback
      setTrackingEnabled(prevTracking);
      setLocationEnabled(prevLocation);
      alert("Update failed. Changes reverted.");
    }

    setSaving(false);
  };

  /* ================= REQUEST LOCATION ================= */
  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      alert("Location is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => toggle("locationEnabled", true),
      () => alert("Location permission denied.")
    );
  };

  return (
    <section className={styles.section}>
      <h3>Device & Location</h3>

      {/* ===== DEVICE TRACKING ===== */}
      <div className={styles.card}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            {trackingEnabled ? (
              <MdGpsFixed className={styles.iconActive} />
            ) : (
              <MdGpsOff className={styles.iconInactive} />
            )}

            <div>
              <strong>Device Tracking</strong>
              <p className={styles.muted}>
                Enables SOS alerts, live tracking, and safety features.
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={trackingEnabled}
            disabled={saving}
            onChange={(e) =>
              toggle("trackingEnabled", e.target.checked)
            }
          />
        </div>
      </div>

      {/* ===== LOCATION ===== */}
      <div className={styles.card}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <MdLocationOn />
            <div>
              <strong>Location & Maps</strong>
              <p className={styles.muted}>
                Allows location sharing and map features.
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={locationEnabled}
            disabled={
              saving ||
              locationPermission === "denied" ||
              locationPermission === "unsupported"
            }
            onChange={(e) =>
              toggle("locationEnabled", e.target.checked)
            }
          />
        </div>

        {/* ===== PERMISSION STATES ===== */}
        {locationPermission === "denied" && (
          <div className={styles.warning}>
            <MdWarning />
            Location permission denied in browser settings.
          </div>
        )}

        {locationPermission === "prompt" &&
          !locationEnabled && (
            <button
              className={styles.secondaryBtn}
              onClick={requestLocationPermission}
            >
              Request Location Permission
            </button>
          )}

        {locationPermission === "unsupported" && (
          <p className={styles.muted}>
            Location services are not supported on this device.
          </p>
        )}
      </div>
    </section>
  );
}
