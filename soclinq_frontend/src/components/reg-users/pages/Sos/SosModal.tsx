"use client";

import styles from "./styles/SosModal.module.css";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";

import PreSosPanel from "./PreSosPanel";
const ActiveSosPanel = dynamic(() => import("./ActiveSosPanel"), {
  ssr: false,
});
type SosStep = "PRE" | "ACTIVE";

interface SosFlowModalProps {
  onClose: () => void;
}

export default function SosFlowModal({ onClose }: SosFlowModalProps) {
  const [step, setStep] = useState<SosStep>("PRE");

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        {/* ================= MODAL HEADER ================= */}
        <header className={styles.header}>
          <h2 className={styles.title}>
            {step === "PRE" ? "Emergency SOS" : "SOS Active"}
          </h2>

          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close SOS modal"
          >
            <FaTimes />
          </button>
        </header>

        {/* ================= MODAL BODY ================= */}
        <div className={styles.body}>
          {step === "PRE" && (
            <PreSosPanel
              onClose={onClose}
              onStart={() => setStep("ACTIVE")}
            />
          )}

          {step === "ACTIVE" && (
            <ActiveSosPanel onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
