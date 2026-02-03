"use client";

import { useMemo, useState } from "react";
import {
  MdLanguage,
  MdShield,
  MdVisibilityOff,
  MdNotificationsActive,
  MdLocationOn,
  MdTimer,
  MdPhone,
  MdMic,
  MdInfo,
} from "react-icons/md";

import styles from "./styles/MiscellaneousSettingsSection.module.css";

import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";
import { profileAdapter } from "@/lib/profileAdapter";

import type { UserProfile } from "@/types/profile";

type Props = {
  profile: UserProfile;

  /** ✅ Safe patch updater (never receives null) */
  patchProfile: (fn: (prev: UserProfile) => UserProfile) => void;

  /** ✅ Optional refresh from backend */
  refreshProfile?: () => Promise<void>;
};

const toBool = (v: any, fallback: boolean) =>
  typeof v === "boolean" ? v : fallback;

const toNum = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function MiscellaneousSettingsSection({
  profile,
  patchProfile,
  refreshProfile,
}: Props) {
  const notify = useNotify();

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const s: any = profile?.settings ?? {};

  const form = useMemo(() => {
    return {
      preferred_language: profile?.identity?.preferred_language ?? "en",

      allow_messages_from: s.allow_messages_from ?? "EVERYONE",
      allow_push_notifications: toBool(s.allow_push_notifications, true),
      allow_anonymous_reports: toBool(s.allow_anonymous_reports, false),

      emergency_mode_enabled: toBool(s.emergency_mode_enabled, true),
      allow_location_sharing: toBool(s.allow_location_sharing, true),

      searchable_by_username: toBool(s.searchable_by_username, true),
      hide_last_seen: toBool(s.hide_last_seen, false),

      sos_silent_mode: toBool(s.sos_silent_mode, false),
      sos_countdown_seconds: toNum(s.sos_countdown_seconds, 5),

      sos_auto_call_enabled: toBool(s.sos_auto_call_enabled, false),
      sos_auto_share_location: toBool(s.sos_auto_share_location, true),
      sos_auto_record_audio: toBool(s.sos_auto_record_audio, false),

      allow_device_binding: toBool(s.allow_device_binding, true),
      allow_media_upload: toBool(s.allow_media_upload, true),

      quiet_hours_enabled: toBool(s.quiet_hours_enabled, false),
      quiet_hours_start: s.quiet_hours_start ?? null,
      quiet_hours_end: s.quiet_hours_end ?? null,
    };
  }, [
    profile?.identity?.preferred_language,
    s.allow_messages_from,
    s.allow_push_notifications,
    s.allow_anonymous_reports,
    s.emergency_mode_enabled,
    s.allow_location_sharing,
    s.searchable_by_username,
    s.hide_last_seen,
    s.sos_silent_mode,
    s.sos_countdown_seconds,
    s.sos_auto_call_enabled,
    s.sos_auto_share_location,
    s.sos_auto_record_audio,
    s.allow_device_binding,
    s.allow_media_upload,
    s.quiet_hours_enabled,
    s.quiet_hours_start,
    s.quiet_hours_end,
  ]);

  const disabled = (key: string) => savingKey === key;

  function applyPatchToProfile(patch: Record<string, any>) {
    patchProfile((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        preferred_language:
          patch.preferred_language ?? prev.identity.preferred_language,
      },
      settings: {
        ...(prev.settings ?? {}),
        ...patch,
      },
    }));
  }

  async function patchInstant(key: string, patch: Record<string, any>) {
    if (savingKey) return; // prevent parallel writes

    setSavingKey(key);

    // ✅ snapshot ONLY what we might change (small + safe)
    const snapshot = {
      preferred_language: profile.identity.preferred_language,
      settings: profile.settings ?? {},
    };

    // ✅ optimistic update
    applyPatchToProfile(patch);

    try {
      const res = await authFetch(profileAdapter.updateSettings(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // ✅ rollback
        patchProfile((prev) => ({
          ...prev,
          identity: {
            ...prev.identity,
            preferred_language: snapshot.preferred_language,
          },
          settings: {
            ...(snapshot.settings ?? {}),
          },
        }));

        notify({
          type: "error",
          title: "Update failed",
          message: data?.error || "Unable to update setting.",
          duration: 2800,
        });
        return;
      }

      notify({
        type: "success",
        title: "Saved",
        message: "Updated ✅",
        duration: 1200,
      });

      // ✅ optional re-sync from backend if needed
      await refreshProfile?.();
    } catch {
      // ✅ rollback
      patchProfile((prev) => ({
        ...prev,
        identity: {
          ...prev.identity,
          preferred_language: snapshot.preferred_language,
        },
        settings: {
          ...(snapshot.settings ?? {}),
        },
      }));

      notify({
        type: "error",
        title: "Network error",
        message: "Could not update setting right now.",
        duration: 2800,
      });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.topRow}>
        <div>
          <h3 className={styles.title}>Miscellaneous</h3>
          <p className={styles.subtext}>
            Instant settings for safety, privacy, and SOS behavior.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* ================= Preferences ================= */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <MdLanguage />
            <h4>Preferences</h4>
          </div>

          <label className={styles.label}>
            Language
            <select
              className={styles.input}
              value={form.preferred_language}
              disabled={disabled("preferred_language")}
              onChange={(e) =>
                patchInstant("preferred_language", {
                  preferred_language: e.target.value,
                })
              }
            >
              <option value="en">English</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
              <option value="yo">Yoruba</option>
            </select>
          </label>

          <label className={styles.label}>
            Who can message me
            <select
              className={styles.input}
              value={form.allow_messages_from}
              disabled={disabled("allow_messages_from")}
              onChange={(e) =>
                patchInstant("allow_messages_from", {
                  allow_messages_from: e.target.value,
                })
              }
            >
              <option value="EVERYONE">Everyone</option>
              <option value="CONTACTS_ONLY">Contacts only</option>
              <option value="VERIFIED_ONLY">Verified only</option>
            </select>
          </label>

          <label className={styles.switchRow}>
            <span>
              <MdNotificationsActive /> Push notifications
            </span>
            <input
              type="checkbox"
              checked={form.allow_push_notifications}
              disabled={disabled("allow_push_notifications")}
              onChange={(e) =>
                patchInstant("allow_push_notifications", {
                  allow_push_notifications: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>
              <MdShield /> Anonymous reporting
            </span>
            <input
              type="checkbox"
              checked={form.allow_anonymous_reports}
              disabled={disabled("allow_anonymous_reports")}
              onChange={(e) =>
                patchInstant("allow_anonymous_reports", {
                  allow_anonymous_reports: e.target.checked,
                })
              }
            />
          </label>
        </div>

        {/* ================= SOS & Safety ================= */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <MdShield />
            <h4>SOS & Safety</h4>
          </div>

          <label className={styles.switchRow}>
            <span>Emergency mode</span>
            <input
              type="checkbox"
              checked={form.emergency_mode_enabled}
              disabled={disabled("emergency_mode_enabled")}
              onChange={(e) =>
                patchInstant("emergency_mode_enabled", {
                  emergency_mode_enabled: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>
              <MdVisibilityOff /> Silent SOS mode
            </span>
            <input
              type="checkbox"
              checked={form.sos_silent_mode}
              disabled={disabled("sos_silent_mode")}
              onChange={(e) =>
                patchInstant("sos_silent_mode", {
                  sos_silent_mode: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.label}>
            <span className={styles.inlineLabel}>
              <MdTimer /> SOS Countdown (seconds)
            </span>
            <input
              className={styles.input}
              type="number"
              min={0}
              max={15}
              value={form.sos_countdown_seconds}
              disabled={disabled("sos_countdown_seconds")}
              onChange={(e) =>
                patchInstant("sos_countdown_seconds", {
                  sos_countdown_seconds: Math.max(
                    0,
                    Math.min(15, Number(e.target.value || 0))
                  ),
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>
              <MdPhone /> Auto-call on SOS
            </span>
            <input
              type="checkbox"
              checked={form.sos_auto_call_enabled}
              disabled={disabled("sos_auto_call_enabled")}
              onChange={(e) =>
                patchInstant("sos_auto_call_enabled", {
                  sos_auto_call_enabled: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>
              <MdLocationOn /> Auto-share location
            </span>
            <input
              type="checkbox"
              checked={form.sos_auto_share_location}
              disabled={disabled("sos_auto_share_location")}
              onChange={(e) =>
                patchInstant("sos_auto_share_location", {
                  sos_auto_share_location: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>
              <MdMic /> Auto-record audio
            </span>
            <input
              type="checkbox"
              checked={form.sos_auto_record_audio}
              disabled={disabled("sos_auto_record_audio")}
              onChange={(e) =>
                patchInstant("sos_auto_record_audio", {
                  sos_auto_record_audio: e.target.checked,
                })
              }
            />
          </label>

          <p className={styles.helper}>
            <MdInfo />
            These actions trigger automatically when SOS is activated.
          </p>
        </div>

        {/* ================= Visibility ================= */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <MdVisibilityOff />
            <h4>Visibility</h4>
          </div>

          <label className={styles.switchRow}>
            <span>Searchable by username</span>
            <input
              type="checkbox"
              checked={form.searchable_by_username}
              disabled={disabled("searchable_by_username")}
              onChange={(e) =>
                patchInstant("searchable_by_username", {
                  searchable_by_username: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>Hide last seen</span>
            <input
              type="checkbox"
              checked={form.hide_last_seen}
              disabled={disabled("hide_last_seen")}
              onChange={(e) =>
                patchInstant("hide_last_seen", {
                  hide_last_seen: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>Allow device binding</span>
            <input
              type="checkbox"
              checked={form.allow_device_binding}
              disabled={disabled("allow_device_binding")}
              onChange={(e) =>
                patchInstant("allow_device_binding", {
                  allow_device_binding: e.target.checked,
                })
              }
            />
          </label>

          <label className={styles.switchRow}>
            <span>Allow media uploads</span>
            <input
              type="checkbox"
              checked={form.allow_media_upload}
              disabled={disabled("allow_media_upload")}
              onChange={(e) =>
                patchInstant("allow_media_upload", {
                  allow_media_upload: e.target.checked,
                })
              }
            />
          </label>
        </div>
      </div>
    </section>
  );
}
