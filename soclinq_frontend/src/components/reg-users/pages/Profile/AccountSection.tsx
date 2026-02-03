"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MdEdit, MdSave, MdClose, MdCheckCircle } from "react-icons/md";

import styles from "./styles/AccountSection.module.css";

import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";
import { profileAdapter } from "@/lib/profileAdapter";

import type { UserProfile } from "@/types/profile";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const OTP_COOLDOWN = 60;

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function normalizeUsernameInput(v: string) {
  return v.trim().replace(/\s+/g, "");
}

type Props = {
  profile: UserProfile;

  /** ✅ Safe patch updater (never receives null) */
  patchProfile: (fn: (prev: UserProfile) => UserProfile) => void;

  /** ✅ Optional: full refresh from server after updates */
  refreshProfile?: () => Promise<void>;
};

export default function AccountSection({
  profile,
  patchProfile,
  refreshProfile,
}: Props) {
  const notify = useNotify();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const disabledAll =
    saving || uploadingPhoto || checkingUsername || verifyingOtp || sendingOtp;

  // ✅ Source of truth snapshot for reset/dirty-check
  const original = useMemo(() => {
    return {
      id: safeStr(profile?.identity?.id),
      full_name: safeStr(profile?.identity?.full_name),
      username: safeStr(profile?.identity?.username),
      phone_number: safeStr(profile?.identity?.phone_number),
      photo: profile?.identity?.live_photo ?? null,
      role: profile?.role ?? "USER",
    };
  }, [profile]);

  // ✅ Local form (instant typing)
  const [form, setForm] = useState({
    full_name: original.full_name,
    username: original.username,
    phone_number: original.phone_number,
  });

  const phoneChanged = useMemo(() => {
    return form.phone_number.trim() !== original.phone_number.trim();
  }, [form.phone_number, original.phone_number]);

  const usernameChanged = useMemo(() => {
    return (
      normalizeUsernameInput(form.username) !==
      normalizeUsernameInput(original.username)
    );
  }, [form.username, original.username]);

  const nameChanged = useMemo(() => {
    return form.full_name.trim() !== original.full_name.trim();
  }, [form.full_name, original.full_name]);

  const canSave = useMemo(() => {
    const anyChanges = phoneChanged || usernameChanged || nameChanged;
    if (!anyChanges) return false;

    if (usernameChanged && !usernameAvailable) return false;
    if (phoneChanged && !phoneVerified) return false;

    return true;
  }, [phoneChanged, usernameChanged, nameChanged, usernameAvailable, phoneVerified]);

  // ✅ If profile changes externally (refresh/login), sync form cleanly
  useEffect(() => {
    setForm({
      full_name: original.full_name,
      username: original.username,
      phone_number: original.phone_number,
    });

    setEditing(false);
    setOtpSent(false);
    setOtp("");
    setCooldown(0);
    setPhoneVerified(true);
    setUsernameAvailable(true);
  }, [original.full_name, original.username, original.phone_number]);

  // ✅ Countdown
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ✅ Phone changed while editing => require OTP again
  useEffect(() => {
    if (!editing) return;

    if (phoneChanged) {
      setPhoneVerified(false);
      setOtpSent(false);
      setOtp("");
    } else {
      setPhoneVerified(true);
      setOtpSent(false);
      setOtp("");
    }
  }, [editing, phoneChanged]);

  async function checkUsername(u: string) {
    const username = normalizeUsernameInput(u);

    if (!username) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);

    try {
      const res = await authFetch(profileAdapter.checkUsername(username), {
        method: "GET",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setUsernameAvailable(false);
        notify({
          type: "error",
          title: "Username check failed",
          message: data?.error || "Unable to check username availability.",
          duration: 2800,
        });
        return;
      }

      const available = Boolean(data?.available);

      if (!available && usernameChanged) {
        setUsernameAvailable(false);
        notify({
          type: "warning",
          title: "Username unavailable",
          message: data?.reason || "This username is reserved or already taken.",
          duration: 3200,
        });
      } else {
        setUsernameAvailable(true);
      }
    } catch {
      setUsernameAvailable(false);
      notify({
        type: "error",
        title: "Network error",
        message: "Could not check username right now.",
        duration: 2500,
      });
    } finally {
      setCheckingUsername(false);
    }
  }

  async function requestOtp() {
    if (cooldown > 0 || sendingOtp) return;

    const phone = form.phone_number.trim();
    if (!phone) {
      notify({
        type: "warning",
        title: "Missing phone number",
        message: "Enter a phone number first.",
        duration: 2400,
      });
      return;
    }

    setSendingOtp(true);

    try {
      const res = await authFetch(profileAdapter.requestPhoneOtp(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        notify({
          type: "error",
          title: "OTP failed",
          message: data?.error || "Could not send OTP.",
          duration: 3000,
        });
        return;
      }

      setOtpSent(true);
      setCooldown(OTP_COOLDOWN);

      notify({
        type: "success",
        title: "OTP sent",
        message: "Check your phone for the verification code.",
        duration: 2200,
      });
    } catch {
      notify({
        type: "error",
        title: "OTP error",
        message: "Network error sending OTP.",
        duration: 2800,
      });
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (verifyingOtp) return;

    const code = otp.trim();
    if (code.length < 4) {
      notify({
        type: "warning",
        title: "Invalid OTP",
        message: "Enter the OTP code you received.",
        duration: 2400,
      });
      return;
    }

    setVerifyingOtp(true);

    try {
      const res = await authFetch(profileAdapter.verifyPhoneOtp(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: form.phone_number.trim(),
          code,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        notify({
          type: "error",
          title: "Verification failed",
          message: data?.error || "Incorrect OTP code.",
          duration: 2800,
        });
        return;
      }

      setPhoneVerified(true);

      notify({
        type: "success",
        title: "Verified",
        message: "Phone number verified ✅",
        duration: 2200,
      });
    } catch {
      notify({
        type: "error",
        title: "Network error",
        message: "Could not verify OTP right now.",
        duration: 2800,
      });
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      notify({
        type: "warning",
        title: "Invalid file",
        message: "Only JPG, PNG, or WEBP images allowed.",
        duration: 2600,
      });
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      notify({
        type: "warning",
        title: "File too large",
        message: "Max photo size is 2MB.",
        duration: 2600,
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    // ✅ optimistic UI update immediately
    const snapshotPhoto = original.photo;

    patchProfile((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        live_photo: previewUrl,
      },
    }));

    setUploadingPhoto(true);

    try {
      const fd = new FormData();
      fd.append("photo", file);

      const res = await authFetch(profileAdapter.uploadPhoto(), {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // rollback
        patchProfile((prev) => ({
          ...prev,
          identity: {
            ...prev.identity,
            live_photo: snapshotPhoto,
          },
        }));

        notify({
          type: "error",
          title: "Upload failed",
          message: data?.error || "Could not upload photo.",
          duration: 3200,
        });

        return;
      }

      patchProfile((prev) => ({
        ...prev,
        identity: {
          ...prev.identity,
          live_photo: data?.photo_url || previewUrl,
        },
      }));

      notify({
        type: "success",
        title: "Updated",
        message: "Profile photo updated ✅",
        duration: 2000,
      });

      // optional: full refresh to keep profile consistent
      await refreshProfile?.();
    } catch {
      patchProfile((prev) => ({
        ...prev,
        identity: {
          ...prev.identity,
          live_photo: snapshotPhoto,
        },
      }));

      notify({
        type: "error",
        title: "Upload error",
        message: "Something went wrong uploading photo.",
        duration: 2800,
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveChanges() {
    if (saving || !canSave) return;

    const snapshot = {
      full_name: original.full_name,
      username: original.username,
      phone_number: original.phone_number,
    };

    // ✅ optimistic UI
    patchProfile((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        full_name: form.full_name.trim(),
        username: normalizeUsernameInput(form.username),
        phone_number: form.phone_number.trim(),
      },
    }));

    setSaving(true);

    try {
      // ✅ 1) update full_name + phone_number
      const res = await authFetch(profileAdapter.updateAccount(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone_number: form.phone_number.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // rollback
        patchProfile((prev) => ({
          ...prev,
          identity: {
            ...prev.identity,
            full_name: snapshot.full_name,
            username: snapshot.username,
            phone_number: snapshot.phone_number,
          },
        }));

        notify({
          type: "error",
          title: "Save failed",
          message: data?.error || "Could not update your profile.",
          duration: 3200,
        });
        return;
      }

      // ✅ 2) update username (if changed)
      if (usernameChanged) {
        const username = normalizeUsernameInput(form.username);

        const uRes = await authFetch(profileAdapter.setUsername(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            entity_type: "USER",
            entity_id: original.id,
          }),
        });

        const uData = await uRes.json().catch(() => ({}));

        if (!uRes.ok) {
          // rollback
          patchProfile((prev) => ({
            ...prev,
            identity: {
              ...prev.identity,
              full_name: snapshot.full_name,
              username: snapshot.username,
              phone_number: snapshot.phone_number,
            },
          }));

          notify({
            type: "error",
            title: "Username update failed",
            message: uData?.error || "Could not set username.",
            duration: 3400,
          });
          return;
        }
      }

      notify({
        type: "success",
        title: "Saved",
        message: "Account updated successfully ✅",
        duration: 2200,
      });

      setEditing(false);

      // ✅ optional refresh to sync any backend returned fields
      await refreshProfile?.();
    } catch {
      // rollback
      patchProfile((prev) => ({
        ...prev,
        identity: {
          ...prev.identity,
          full_name: snapshot.full_name,
          username: snapshot.username,
          phone_number: snapshot.phone_number,
        },
      }));

      notify({
        type: "error",
        title: "Network error",
        message: "Unable to save changes right now.",
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);

    setForm({
      full_name: original.full_name,
      username: original.username,
      phone_number: original.phone_number,
    });

    setOtpSent(false);
    setOtp("");
    setCooldown(0);
    setPhoneVerified(true);
    setUsernameAvailable(true);
  }

  function resetForm() {
    setForm({
      full_name: original.full_name,
      username: original.username,
      phone_number: original.phone_number,
    });

    setOtpSent(false);
    setOtp("");
    setCooldown(0);
    setPhoneVerified(true);
    setUsernameAvailable(true);

    notify({
      type: "info",
      title: "Reset",
      message: "Changes cleared.",
      duration: 1800,
    });
  }

  return (
    <div className={styles.section}>
      <div className={styles.topRow}>
        <div>
          <h3 className={styles.heading}>Account</h3>
          <p className={styles.subtext}>Update your identity and contact information.</p>
        </div>

        {!editing ? (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setEditing(true)}
          >
            <MdEdit /> Edit
          </button>
        ) : (
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={disabledAll}
            onClick={cancelEdit}
          >
            <MdClose /> Cancel
          </button>
        )}
      </div>

      <div className={styles.avatarRow}>
        <div className={styles.avatar}>
          {profile?.identity?.live_photo ? (
            <img src={profile.identity.live_photo} alt="" />
          ) : (
            <span className={styles.fallbackAvatar}>U</span>
          )}
        </div>

        <div className={styles.avatarInfo}>
          <div className={styles.avatarName}>
            {profile?.identity?.full_name || "Unnamed User"}
          </div>

          <div className={styles.avatarMeta}>
            @{profile?.identity?.username || "no-username"} • {profile?.role}
          </div>
        </div>

        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabledAll}
          onClick={() => fileRef.current?.click()}
        >
          {uploadingPhoto ? "Uploading…" : "Change Photo"}
        </button>

        <input
          ref={fileRef}
          type="file"
          hidden
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadPhoto(f);
          }}
        />
      </div>

      <div className={styles.card}>
        <label className={styles.label}>
          Full Name
          <input
            className={styles.input}
            value={form.full_name}
            readOnly={!editing}
            disabled={disabledAll}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </label>

        <label className={styles.label}>
          Username
          <input
            className={styles.input}
            value={form.username}
            readOnly={!editing}
            disabled={disabledAll}
            onChange={(e) => {
              const v = normalizeUsernameInput(e.target.value);
              setForm({ ...form, username: v });
              setUsernameAvailable(true); // reset to neutral while typing
            }}
            onBlur={() => {
              if (editing && usernameChanged) checkUsername(form.username);
            }}
          />

          {editing && usernameChanged && (
            <small className={usernameAvailable ? styles.goodHint : styles.badHint}>
              {checkingUsername
                ? "Checking username..."
                : usernameAvailable
                ? "Username available ✅"
                : "Username not available ❌"}
            </small>
          )}
        </label>

        <label className={styles.label}>
          Phone Number
          <input
            className={styles.input}
            value={form.phone_number}
            readOnly={!editing}
            disabled={disabledAll}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          />
        </label>

        {editing && phoneChanged && !phoneVerified && (
          <div className={styles.otpBox}>
            {!otpSent ? (
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={cooldown > 0 || disabledAll}
                onClick={requestOtp}
              >
                {sendingOtp ? "Sending…" : "Send OTP"}
              </button>
            ) : (
              <div className={styles.otpRow}>
                <input
                  className={styles.otpInput}
                  placeholder="Enter OTP"
                  value={otp}
                  disabled={disabledAll}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={disabledAll}
                  onClick={verifyOtp}
                >
                  {verifyingOtp ? "Verifying…" : "Verify"}
                </button>
              </div>
            )}

            {cooldown > 0 && (
              <small className={styles.muted}>Resend in {cooldown}s</small>
            )}
          </div>
        )}

        {!phoneChanged && (
          <small className={styles.success}>
            <MdCheckCircle /> Phone verified
          </small>
        )}

        {editing && (
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!canSave || disabledAll}
              onClick={saveChanges}
            >
              <MdSave /> {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={disabledAll}
              onClick={resetForm}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
