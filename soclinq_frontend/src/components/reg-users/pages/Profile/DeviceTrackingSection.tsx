"use client";

import { useEffect, useMemo, useState } from "react";
import { MdGpsFixed, MdGpsOff, MdLocationOn, MdWarning } from "react-icons/md";

import styles from "./styles/DeviceTracking.module.css";

import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";
import { profileAdapter } from "@/lib/profileAdapter";

import type { UserProfile } from "@/types/profile";

type Props = {
  profile: UserProfile;

  /** ✅ Safe patch updater (never receives null) */
  patchProfile: (fn: (prev: UserProfile) => UserProfile) => void;

  /** ✅ Optional: refresh from backend */
  refreshProfile?: () => Promise<void>;
};

type DeviceSettingsPatch = Partial<{
  tracking_enabled: boolean;
  location_enabled: boolean;
  allow_location_sharing: boolean;
  allow_push_notifications: boolean;
}>;

function bool(v: any, fallback = false) {
  return typeof v === "boolean" ? v : fallback;
}

export default function DeviceTrackingSection({
  profile,
  patchProfile,
  refreshProfile,
}: Props) {
  const notify = useNotify();

  const [saving, setSaving] = useState(false);

  const [locationPermission, setLocationPermission] = useState<
    PermissionState | "unsupported"
  >("prompt");

  const settings = profile?.settings ?? {};

  const trackingEnabled = bool(settings.tracking_enabled, true);
  const locationEnabled = bool(settings.location_enabled, true);
  const allowLocationSharing = bool(settings.allow_location_sharing, true);
  const allowPush = bool(settings.allow_push_notifications, true);

  const disabledAll = saving;

  const canToggleLocation = useMemo(() => {
    return (
      locationPermission !== "denied" && locationPermission !== "unsupported"
    );
  }, [locationPermission]);

  useEffect(() => {
    let mounted = true;

    async function checkPermissions() {
      if (!("permissions" in navigator)) {
        if (mounted) setLocationPermission("unsupported");
        return;
      }

      try {
        const res = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });

        if (!mounted) return;

        setLocationPermission(res.state);

        res.onchange = () => {
          if (!mounted) return;
          setLocationPermission(res.state);
        };
      } catch {
        if (mounted) setLocationPermission("unsupported");
      }
    }

    checkPermissions();

    return () => {
      mounted = false;
    };
  }, []);

  async function patchSettings(patch: DeviceSettingsPatch) {
    if (saving) return false;

    setSaving(true);

    // ✅ snapshot current settings only (not whole profile)
    const snapshot = {
      tracking_enabled: trackingEnabled,
      location_enabled: locationEnabled,
      allow_location_sharing: allowLocationSharing,
      allow_push_notifications: allowPush,
    };

    // ✅ optimistic update
    patchProfile((prev) => ({
      ...prev,
      settings: {
        ...(prev.settings ?? {}),
        ...patch,
      },
    }));

    try {
      const res = await authFetch(profileAdapter.updateDeviceSettings(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // ✅ rollback on error
        patchProfile((prev) => ({
          ...prev,
          settings: {
            ...(prev.settings ?? {}),
            ...snapshot,
          },
        }));

        notify({
          type: "error",
          title: "Update failed",
          message: data?.error || "Unable to update device settings.",
          duration: 3200,
        });

        return false;
      }

      notify({
        type: "success",
        title: "Updated",
        message: "Device settings updated ✅",
        duration: 1800,
      });

      // ✅ optional sync from server if backend modifies fields
      await refreshProfile?.();

      return true;
    } catch {
      patchProfile((prev) => ({
        ...prev,
        settings: {
          ...(prev.settings ?? {}),
          ...snapshot,
        },
      }));

      notify({
        type: "error",
        title: "Network error",
        message: "Could not save device settings right now.",
        duration: 3200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  function requestLocationPermission() {
    if (!navigator.geolocation) {
      notify({
        type: "warning",
        title: "Unsupported",
        message: "Location is not supported on this device/browser.",
        duration: 3000,
      });
      return;
    }

    notify({
      type: "info",
      title: "Permission required",
      message: "Please allow location access to enable maps and SOS safety.",
      duration: 2500,
    });

    navigator.geolocation.getCurrentPosition(
      async () => {
        await patchSettings({ location_enabled: true });
      },
      () => {
        notify({
          type: "error",
          title: "Denied",
          message:
            "Location permission denied. Enable it in browser settings and retry.",
          duration: 3600,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
      }
    );
  }

  async function toggleTracking(next: boolean) {
    if (!next) {
      notify({
        type: "warning",
        title: "Device tracking disabled",
        message:
          "This may reduce SOS accuracy and live safety tracking. You can turn it back on anytime.",
        confirm: {
          label: "Disable anyway",
          onConfirm: async () => {
            await patchSettings({ tracking_enabled: false });
          },
        },
      });
      return;
    }

    await patchSettings({ tracking_enabled: true });
  }

  async function toggleLocation(next: boolean) {
    if (next && !canToggleLocation) {
      notify({
        type: "warning",
        title: "Location blocked",
        message:
          "Location permission is denied or unsupported. Enable it in settings.",
        duration: 3600,
      });
      return;
    }

    await patchSettings({ location_enabled: next });
  }

  async function toggleLocationSharing(next: boolean) {
    await patchSettings({ allow_location_sharing: next });
  }

  async function togglePush(next: boolean) {
    await patchSettings({ allow_push_notifications: next });
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>Device & Location</h3>
          <p className={styles.subtitle}>
            Control tracking, maps, and SOS safety permissions.
          </p>
        </div>
      </div>

      {/* ================= Device Tracking ================= */}
      <div className={styles.card}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            {trackingEnabled ? (
              <MdGpsFixed className={styles.iconActive} />
            ) : (
              <MdGpsOff className={styles.iconInactive} />
            )}

            <div>
              <strong className={styles.labelTitle}>Device Tracking</strong>
              <p className={styles.muted}>
                Helps SOS accuracy, incident logging, and safety automation.
              </p>
            </div>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={trackingEnabled}
              disabled={disabledAll}
              onChange={(e) => toggleTracking(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>
      </div>

      {/* ================= Location & Maps ================= */}
      <div className={styles.card}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <MdLocationOn className={styles.iconPrimary} />
            <div>
              <strong className={styles.labelTitle}>Location & Maps</strong>
              <p className={styles.muted}>
                Allows hub matching, emergency geofence alerts, and navigation.
              </p>
            </div>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={locationEnabled}
              disabled={disabledAll || !canToggleLocation}
              onChange={(e) => toggleLocation(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>

        {locationPermission === "denied" && (
          <div className={styles.warningBox}>
            <MdWarning />
            <span>
              Location permission is blocked in browser settings. Enable it and
              try again.
            </span>
          </div>
        )}

        {locationPermission === "prompt" && !locationEnabled && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={requestLocationPermission}
            disabled={disabledAll}
          >
            Request Location Permission
          </button>
        )}

        {locationPermission === "unsupported" && (
          <p className={styles.muted}>
            Location services are not supported on this device/browser.
          </p>
        )}
      </div>

      {/* ================= Location Sharing ================= */}
      <div className={styles.card}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <div>
              <strong className={styles.labelTitle}>Allow Location Sharing</strong>
              <p className={styles.muted}>
                Lets trusted contacts and SOS responders see your live position
                during emergencies.
              </p>
            </div>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={allowLocationSharing}
              disabled={disabledAll || !locationEnabled}
              onChange={(e) => toggleLocationSharing(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>
      </div>

      {/* ================= Push Notifications ================= */}
      <div className={styles.card}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <div>
              <strong className={styles.labelTitle}>Push Notifications</strong>
              <p className={styles.muted}>
                Receive SOS alerts, hub activity updates, and private message
                notifications.
              </p>
            </div>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={allowPush}
              disabled={disabledAll}
              onChange={(e) => togglePush(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>
      </div>
    </section>
  );
}
