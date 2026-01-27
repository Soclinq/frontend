"use client";

import styles from "./styles/SosControls.module.css";
import {
  MdDangerous,
  MdClose,
} from "react-icons/md";
import { useState } from "react";

import SosModal from "./SosModal";
import { getSocket } from "@/lib/socket";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export default function SosControls() {
  const socket = getSocket();

  /* ================= LOCAL (UI) STATE ================= */

  const [sosStatus, setSosStatus] = useState("Idle");
  const [sosRisk, setSosRisk] = useState<RiskLevel>("LOW");
  const [sosActive, setSosActive] = useState(false);
  const [sosReplaying, setSosReplaying] = useState(false);
  const [showModal, setShowModal] = useState(false);

  /* ================= PLACEHOLDER FETCH ================= */

  const triggerSOS = async (data: { message: string }) => {
    setShowModal(false);
    setSosStatus("Activating SOS…");

    try {
      await fetch("/api/sos/trigger", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // UI optimism (local only)
      setSosActive(true);
      setSosRisk("MEDIUM");
      setSosStatus("SOS ACTIVE");

      socket.emit("sos:started");
    } catch {
      setSosStatus("SOS failed");
    }
  };

  const closeSOS = async () => {
    try {
      await fetch("/api/sos/close", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setSosActive(false);
      setSosRisk("LOW");
      setSosStatus("Idle");

      socket.emit("sos:stopped");
    }
  };

  const replaySOS = async () => {
    setSosReplaying(true);

    try {
      const res = await fetch("/api/sos/history", {
        credentials: "include",
      });

      const history = res.ok ? await res.json() : [];
      socket.emit("sos:replay", history);
    } catch {
      setSosReplaying(false);
    }
  };

  const stopReplay = () => {
    setSosReplaying(false);
    socket.emit("sos:replay:stop");
  };

  /* ================= UI ================= */

  return (
    <>
      <div className={styles.card}>
        <div className={styles.statusRow}>
          <span className={styles.status}>{sosStatus}</span>
          <span className={`${styles.risk} ${styles[sosRisk.toLowerCase()]}`}>
            {sosRisk}
          </span>
        </div>

        {!sosActive ? (
          <button className={styles.sosBtn} onClick={() => setShowModal(true)}>
            <MdDangerous />
            Activate SOS
          </button>
        ) : (
          <button
            className={`${styles.sosBtn} ${styles.active}`}
            onClick={closeSOS}
          >
            <MdClose />
            End SOS
          </button>
        )}
      </div>


        {showModal && (
          <SosModal
            onClose={() => setShowModal(false)}
          />
        )}

    </>
  );
}
