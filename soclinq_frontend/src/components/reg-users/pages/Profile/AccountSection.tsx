"use client";

import { useEffect, useRef, useState } from "react";
import {
  MdEdit,
  MdSave,
  MdClose,
  MdCheckCircle,
} from "react-icons/md";
import { cropImage } from "./utils/imageCrop";
import styles from "./styles/AccountSection.module.css";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const OTP_COOLDOWN = 60;

/* ===== PLACEHOLDER APIs ===== */
async function updateAccount(data: any) {
  return new Promise<{ success: boolean }>((r) =>
    setTimeout(() => r({ success: true }), 900)
  );
}

async function sendOTP() {
  return new Promise((r) => setTimeout(r, 600));
}

async function verifyOTP(code: string) {
  return new Promise<{ success: boolean }>((r) =>
    setTimeout(() => r({ success: code === "123456" }), 600)
  );
}

export default function AccountSection({ profile, setProfile }: any) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: profile?.name,
    username: profile?.username,
    phone: profile?.phone || "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  /* ===== OTP COOLDOWN TIMER ===== */
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(
      () => setCooldown((c) => c - 1),
      1000
    );
    return () => clearInterval(t);
  }, [cooldown]);

  /* ===== OPTIMISTIC SAVE ===== */
  const handleSave = async () => {
    setSaving(true);

    const snapshot = { ...profile };

    // optimistic update
    setProfile({ ...profile, ...form });

    const res = await updateAccount(form);

    if (!res.success) {
      setProfile(snapshot); // rollback
      alert("Update failed. Changes reverted.");
    }

    setSaving(false);
    setEditing(false);
  };

  /* ===== IMAGE UPLOAD + CROP ===== */
  const handlePhoto = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type))
      return alert("Invalid file type");

    if (file.size > MAX_PHOTO_SIZE)
      return alert("Max file size is 2MB");

    const cropped = await cropImage(file);

    const snapshot = { ...profile };
    setProfile({ ...profile, photo: cropped });

    // simulate upload
    const res = await updateAccount({ photo: cropped });
    if (!res.success) setProfile(snapshot);
  };

  /* ===== OTP FLOW ===== */
  const requestOTP = async () => {
    await sendOTP();
    setOtpSent(true);
    setCooldown(OTP_COOLDOWN);
  };

  const confirmOTP = async () => {
    const res = await verifyOTP(otp);
    if (res.success) setVerified(true);
  };

  return (
    <div className={styles.section}>
      <h3>Account Information</h3>

      {/* ===== PROFILE PHOTO ===== */}
      <div className={styles.avatarRow}>
        <div className={styles.avatar}>
          {profile?.photo ? <img src={profile?.photo} /> : "U"}
        </div>

        <button
          className={styles.secondaryBtn}
          onClick={() => fileRef.current?.click()}
        >
          <MdEdit /> Change Photo
        </button>

        <input
          ref={fileRef}
          type="file"
          hidden
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) =>
            e.target.files && handlePhoto(e.target.files[0])
          }
        />
      </div>

      {/* ===== FORM ===== */}
      <div className={styles.card}>
        <label>
          Full Name
          <input
            value={form.name}
            readOnly={!editing}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
        </label>

        <label>
          Username
          <input
            value={form.username}
            readOnly={!editing}
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />
        </label>

        <label>
          Phone Number
          <input
            value={form.phone}
            readOnly={!editing}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />
        </label>

        {/* ===== OTP ===== */}
        {editing && form.phone && !verified && (
          <div className={styles.otp}>
            {!otpSent ? (
              <button onClick={requestOTP}>
                Send OTP
              </button>
            ) : (
              <>
                <input
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button onClick={confirmOTP}>Verify</button>
              </>
            )}

            {cooldown > 0 && (
              <small>Resend in {cooldown}s</small>
            )}
          </div>
        )}

        {verified && (
          <small className={styles.success}>
            <MdCheckCircle /> Phone verified
          </small>
        )}

        {/* ===== ACTIONS ===== */}
        {!editing ? (
          <button
            className={styles.primaryBtn}
            onClick={() => setEditing(true)}
          >
            <MdEdit /> Edit
          </button>
        ) : (
          <div className={styles.actionRow}>
            <button
              className={styles.primaryBtn}
              disabled={saving}
              onClick={handleSave}
            >
              <MdSave /> {saving ? "Saving…" : "Save"}
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => setEditing(false)}
            >
              <MdClose /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
