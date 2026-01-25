"use client";

import { useState } from "react";
import styles from "./styles/Home.module.css";

/* ================= HOOKS ================= */
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLeafletMap } from "@/hooks/useLeafletMap";

/* ================= TYPES ================= */
import { Report } from "@/types/report";
import { SosAlert } from "@/types/sos";

/* ================= ICONS ================= */
import {
  MdWarning,
  MdLiveTv,
  MdCampaign,
  MdMap,
  MdSend,
  MdReport,
  MdLocalFireDepartment,
  MdMedicalServices,
  MdHowToVote,  
} from "react-icons/md";

export default function Home() {
  const [reports, setReports] = useLocalStorage<Report[]>("reports", []);
  const [sos, setSos] = useLocalStorage<SosAlert[]>("sos", []);
  const [reportType, setReportType] = useState("Crime");
  const [desc, setDesc] = useState("");

  const { getLocation } = useGeolocation();

  useLeafletMap("homeMap", [9.082, 8.6753]);

  const submitReport = () => {
    if (!desc.trim()) return alert("Please describe the incident.");

    setReports([
      ...reports,
      {
        type: reportType,
        urgency: "Medium",
        description: desc,
        anonymous: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    setDesc("");
  };

  const sendSOS = async () => {
    try {
      const loc = await getLocation();
      setSos([
        ...sos,
        {
          lat: loc.latitude,
          lng: loc.longitude,
          note: "Emergency SOS",
          createdAt: new Date().toISOString(),
        },
      ]);
      alert("SOS sent successfully.");
    } catch {
      alert("Location access denied.");
    }
  };

  return (
    <section className={styles.home}>
      {/* ================= HERO ================= */}
      <header className={styles.hero}>
        <h1 className={styles.title}>LINQMI Safety Hub</h1>
        <p className={styles.subtitle}>
          Real-time emergency response, community reporting & live alerts
        </p>

        <button className={styles.sosButton} onClick={sendSOS}>
          <MdWarning size={22} />
          Emergency SOS
        </button>
      </header>

      {/* ================= LIVE ================= */}
      <section className={styles.liveSection}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <MdLiveTv /> Live Stream
          </h3>

          <iframe
            className={styles.video}
            src="https://www.youtube.com/embed/5qap5aO4i9A"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <MdCampaign /> Live Updates
          </h3>

          <ul className={styles.updates}>
            <li>Community safety broadcasts</li>
            <li>Verified emergency announcements</li>
            <li>Real-time response coordination</li>
          </ul>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className={styles.stats}>
        <div className={styles.statCard}>
          <strong>{reports.length}</strong>
          <span>Reports Filed</span>
        </div>

        <div className={styles.statCard}>
          <strong>{sos.length}</strong>
          <span>Active SOS</span>
        </div>
      </section>

      {/* ================= ACTION GRID ================= */}
      <section className={styles.actionGrid}>
        {/* REPORT */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <MdReport /> Quick Report
          </h3>

                  <label className={styles.label}>
          Incident Type

          <div className={styles.selectWrap}>
            <span className={styles.selectIcon}>
              {reportType === "Crime" && <MdReport />}
              {reportType === "Fire" && <MdLocalFireDepartment />}
              {reportType === "Medical" && <MdMedicalServices />}
              {reportType === "Election Report" && <MdHowToVote />}
            </span>

            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className={styles.select}
            >
              <option value="Crime">Crime</option>
              <option value="Fire">Fire</option>
              <option value="Medical">Medical</option>
              <option value="Election Report">Election Report</option>
            </select>
          </div>
        </label>


          <label className={styles.label}>
            Description
            <textarea
              placeholder="Describe what happened..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={styles.textarea}
            />
          </label>

          <button className={styles.primaryBtn} onClick={submitReport}>
            <MdSend />
            Submit Report
          </button>
        </div>

        {/* MAP */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <MdMap /> Real-Time SOS Map
          </h3>

          <div id="homeMap" className={styles.map} />

          <button className={styles.secondaryBtn} onClick={sendSOS}>
            <MdWarning />
            Send SOS from Location
          </button>
        </div>
      </section>
    </section>
  );
}
