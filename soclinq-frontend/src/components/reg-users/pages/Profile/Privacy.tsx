"use client";

import styles from "@/styles/Privacy.module.css";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";

interface PrivacySettings {
  location: "Allowed" | "Denied";
  device: "Allowed" | "Denied";
  media: "Allowed" | "Denied";
}

export default function Privacy() {
  const [privacy, setPrivacy] = useLocalStorage<PrivacySettings>(
    "privacy_settings",
    {
      location: "Allowed",
      device: "Allowed",
      media: "Allowed",
    }
  );

  /* -------------------------
     ACTIONS
  -------------------------- */
  const save = () => {
    setPrivacy(privacy);
    alert("Privacy preferences saved");
  };

  const reset = () => {
    setPrivacy({
      location: "Allowed",
      device: "Allowed",
      media: "Allowed",
    });
  };

  const viewData = () => {
    const allData: Record<string, unknown> = {};
    Object.keys(localStorage).forEach(k => {
      try {
        allData[k] = JSON.parse(localStorage.getItem(k) || "");
      } catch {
        allData[k] = localStorage.getItem(k);
      }
    });

    alert("Stored Data (Demo):\n\n" + JSON.stringify(allData, null, 2));
  };

  const deleteData = () => {
    if (
      !confirm(
        "This will request deletion of all stored data (demo clears local storage). Continue?"
      )
    )
      return;

    localStorage.clear();
    alert("Data deletion request processed (demo)");
    window.location.reload();
  };

  return (
    <section className={styles.privacy}>
      <header className={styles.header}>
        <div>
          <h1>Privacy & Consent</h1>
          <p>Manage consent, opt-out options, and data visibility</p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* CONSENT */}
        <section className={styles.panel}>
          <h3>Consent Management</h3>

          <div className={styles.formGrid}>
            <div>
              <label>Location Access</label>
              <select
                value={privacy.location}
                onChange={e =>
                  setPrivacy({ ...privacy, location: e.target.value as any })
                }
              >
                <option>Allowed</option>
                <option>Denied</option>
              </select>
            </div>

            <div>
              <label>Device Binding</label>
              <select
                value={privacy.device}
                onChange={e =>
                  setPrivacy({ ...privacy, device: e.target.value as any })
                }
              >
                <option>Allowed</option>
                <option>Denied</option>
              </select>
            </div>

            <div>
              <label>Media Upload</label>
              <select
                value={privacy.media}
                onChange={e =>
                  setPrivacy({ ...privacy, media: e.target.value as any })
                }
              >
                <option>Allowed</option>
                <option>Denied</option>
              </select>
            </div>
          </div>

          <div className={styles.actionsInline}>
            <button onClick={save}>Save</button>
            <button className={styles.ghost} onClick={reset}>
              Reset
            </button>
          </div>
        </section>

        {/* DATA */}
        <section className={styles.panel}>
          <h3>My Data</h3>

          <div className={styles.actionsStack}>
            <button onClick={viewData}>Display Stored Data</button>
            <button className={styles.ghost} onClick={deleteData}>
              Request Data Deletion
            </button>
          </div>

          <p className={styles.helper}>
            Data retention policy: Reports and SOS logs are retained only for
            safety audits and compliance.
          </p>
        </section>
      </div>
    </section>
  );
}
