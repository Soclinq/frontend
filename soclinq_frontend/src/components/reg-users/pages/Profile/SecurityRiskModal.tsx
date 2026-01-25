"use client";

import { MdCheckCircle, MdWarning, MdClose } from "react-icons/md";
import styles from "./styles/SecurityRiskModal.module.css";
import { SecurityStatus } from "./utils/securityStatus";

interface Props {
  open: boolean;
  onClose: () => void;
  security: SecurityStatus;
}

export default function SecurityRiskModal({
  open,
  onClose,
  security,
}: Props) {
  if (!open) return null;

  const { riskScore, signals } = security;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <h3>Security Risk Details</h3>
          <button onClick={onClose}>
            <MdClose />
          </button>
        </header>

        <p className={styles.riskScore}>
          Overall Risk Score: <strong>{riskScore}/100</strong>
        </p>

        <div className={styles.signalList}>
          <Signal
            ok={signals.phoneVerified}
            label="Phone number verified"
            fix="Verify your phone number"
          />
          <Signal
            ok={signals.trackingEnabled}
            label="Device tracking enabled"
            fix="Enable device tracking"
          />
          <Signal
            ok={signals.locationEnabled}
            label="Location access enabled"
            fix="Enable location permissions"
          />
          <Signal
            ok={!signals.newDeviceDetected}
            label="No unknown devices"
            fix="Review recent devices"
          />
          <Signal
            ok={!signals.recentSuspiciousActivity}
            label="No suspicious activity"
            fix="Secure your account"
          />
        </div>

        <footer className={styles.modalFooter}>
          <button className={styles.primaryBtn} onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ===== SIGNAL ROW ===== */
function Signal({
  ok,
  label,
  fix,
}: {
  ok: boolean;
  label: string;
  fix: string;
}) {
  return (
    <div className={styles.signal}>
      {ok ? (
        <MdCheckCircle className={styles.safe} />
      ) : (
        <MdWarning className={styles.warn} />
      )}

      <div>
        <p>{label}</p>
        {!ok && <small>{fix}</small>}
      </div>
    </div>
  );
}
