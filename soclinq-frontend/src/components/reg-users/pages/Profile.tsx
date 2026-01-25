"use client";

import styles from "./styles/Profile.module.css";
import { useState } from "react";
import { useLocalStorage } from "../../../hooks/useLocalStorage";

interface ProfileData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  language: string;
  notifyStatus: boolean;
  anonDefault: boolean;
  locationSharing: boolean;
  twoFA: "off" | "totp" | "sms";
}

export default function Profile() {
  const [profile, setProfile] = useLocalStorage<ProfileData>("profile", {
    fullName: "",
    username: "",
    email: "",
    phone: "",
    language: "English",
    notifyStatus: true,
    anonDefault: true,
    locationSharing: true,
    twoFA: "off",
  });

  const [password, setPassword] = useState("");

  /* -------------------------
     SAVE
  -------------------------- */
  const saveProfile = () => {
    setProfile(profile);
    alert("Profile updated");
  };

  /* -------------------------
     EXPORT
  -------------------------- */
  const exportCSV = () => {
    const rows = [
      ["Field", "Value"],
      ...Object.entries(profile).map(([k, v]) => [k, String(v)]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "profile_export.csv";
    a.click();
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write("<h2>LINQMI Profile Export</h2><ul>");
    Object.entries(profile).forEach(([k, v]) =>
      w.document.write(`<li><b>${k}</b>: ${v}</li>`)
    );
    w.document.write("</ul>");
    w.document.close();
  };

  return (
    <section className={styles.profile}>
      <header className={styles.header}>
        <div>
          <h1>Profile & Settings</h1>
          <p>Manage personal details, security, privacy and preferences</p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* PERSONAL DETAILS */}
        <section className={styles.panel}>
          <h3>Personal Details</h3>

          <div className={styles.formGrid}>
            <input
              placeholder="Full Name"
              value={profile.fullName}
              onChange={e =>
                setProfile({ ...profile, fullName: e.target.value })
              }
            />
            <input
              placeholder="Username"
              value={profile.username}
              onChange={e =>
                setProfile({ ...profile, username: e.target.value })
              }
            />
            <input
              placeholder="Email"
              type="email"
              value={profile.email}
              onChange={e =>
                setProfile({ ...profile, email: e.target.value })
              }
            />
            <input
              placeholder="Phone"
              type="tel"
              value={profile.phone}
              onChange={e =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />

            <div className={styles.full}>
              <label>Profile Photo</label>
              <input type="file" accept="image/*" />
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section className={styles.panel}>
          <h3>Security</h3>

          <div className={styles.formGrid}>
            <input
              placeholder="New Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <select
              value={profile.twoFA}
              onChange={e =>
                setProfile({
                  ...profile,
                  twoFA: e.target.value as ProfileData["twoFA"],
                })
              }
            >
              <option value="off">2FA Off</option>
              <option value="totp">Authenticator App (TOTP)</option>
              <option value="sms">SMS</option>
            </select>

            <button
              className={styles.ghost}
              onClick={() => alert("Active sessions (demo)")}
            >
              Manage Sessions
            </button>
          </div>
        </section>

        {/* LANGUAGE & NOTIFICATIONS */}
        <section className={styles.panel}>
          <h3>Language & Notifications</h3>

          <div className={styles.formGrid}>
            <select
              value={profile.language}
              onChange={e =>
                setProfile({ ...profile, language: e.target.value })
              }
            >
              <option>English</option>
              <option>Hausa</option>
              <option>Yoruba</option>
              <option>Igbo</option>
              <option>Swahili</option>
              <option>French</option>
            </select>

            <select
              value={profile.notifyStatus ? "on" : "off"}
              onChange={e =>
                setProfile({
                  ...profile,
                  notifyStatus: e.target.value === "on",
                })
              }
            >
              <option value="on">Report Notifications On</option>
              <option value="off">Report Notifications Off</option>
            </select>
          </div>
        </section>

        {/* PRIVACY */}
        <section className={styles.panel}>
          <h3>Privacy Preferences</h3>

          <div className={styles.formGrid}>
            <select
              value={profile.anonDefault ? "on" : "off"}
              onChange={e =>
                setProfile({
                  ...profile,
                  anonDefault: e.target.value === "on",
                })
              }
            >
              <option value="on">Anonymous Reporting On</option>
              <option value="off">Anonymous Reporting Off</option>
            </select>

            <select
              value={profile.locationSharing ? "on" : "off"}
              onChange={e =>
                setProfile({
                  ...profile,
                  locationSharing: e.target.value === "on",
                })
              }
            >
              <option value="on">Location Sharing On</option>
              <option value="off">Location Sharing Off</option>
            </select>

            <div className={styles.full}>
              <label>Export My History</label>
              <div className={styles.actionsInline}>
                <button onClick={exportCSV}>CSV</button>
                <button onClick={exportPDF}>PDF</button>
              </div>
            </div>

            <div className={styles.full}>
              <label>Import Emergency Contacts</label>
              <input type="file" accept=".csv,.vcf" />
            </div>
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <button onClick={saveProfile}>Save Changes</button>
        <button className={styles.ghost}>Logout</button>
      </div>
    </section>
  );
}
