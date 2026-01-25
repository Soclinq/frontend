"use client";

import { useEffect, useState } from "react";
import {
  MdVerifiedUser,
  MdLocationOn,
  MdWarning,
  MdShield,
} from "react-icons/md";
import { useUser } from "@/context/UserContext";
import {
  fetchSecurityStatus,
  SecurityStatus,
} from "./utils/securityStatus";
import { getRiskLevel } from "./utils/getRiskLevel";
import SecurityRiskModal from "./SecurityRiskModal";
import styles from "./styles/ProfileHeader.module.css";

export default function ProfileHeader() {
  const { user } = useUser(); // ✅ READ-ONLY CONTEXT

  const [showRisk, setShowRisk] = useState(false);
  const [security, setSecurity] =
    useState<SecurityStatus | null>(null);

  /* ================= FETCH SECURITY STATUS ================= */
  useEffect(() => {
    let mounted = true;

    fetchSecurityStatus().then((data) => {
      if (mounted) setSecurity(data);
    });

    return () => {
      mounted = false;
    };
  }, []);

  /* ================= AUTO-PROMPT IF HIGH RISK ================= */
  useEffect(() => {
    if (security && getRiskLevel(security.riskScore) === "high") {
      setShowRisk(true);
    }
  }, [security]);

  const riskLevel = security
    ? getRiskLevel(security.riskScore)
    : null;

  return (
    <div className={styles.header}>
      {/* ===== AVATAR ===== */}
      <div className={styles.avatar}>
        {user?.photo ? (
          <img src={user?.photo} alt="Profile" />
        ) : (
          user?.fullName?.charAt(0) || "U"
        )}
      </div>

      {/* ===== IDENTITY ===== */}
      <div className={styles.identity}>
        <h2 className={styles.name}>
          {user?.fullName}
          {user?.phoneVerified && (
            <MdVerifiedUser
              className={styles.verified}
              title="Phone verified"
            />
          )}
        </h2>

        <p className={styles.email}>{user?.email}</p>

        {/* ===== STATUS BADGES ===== */}
        <div className={styles.badges}>
          <span
            className={`${styles.badge} ${
              user?.trackingEnabled
                ? styles.active
                : styles.inactive
            }`}
          >
            {user?.trackingEnabled
              ? "Tracking Active"
              : "Tracking Disabled"}
          </span>

          {user?.locationEnabled && (
            <span className={styles.badge}>
              <MdLocationOn /> Location Enabled
            </span>
          )}
        </div>

        {/* ===== SECURITY RISK ===== */}
        <div className={styles.security}>
          {!security ? (
            <span className={styles.muted}>
              Checking security…
            </span>
          ) : (
            <button
              className={`${styles.risk} ${styles[riskLevel!]}`}
              onClick={() => setShowRisk(true)}
              aria-label="View security risk details"
            >
              {riskLevel === "low" ? (
                <MdShield />
              ) : (
                <MdWarning />
              )}
              Security Risk: {riskLevel?.toUpperCase()}
            </button>
          )}
        </div>
      </div>

      {/* ===== RISK MODAL ===== */}
      {security && (
        <SecurityRiskModal
          open={showRisk}
          onClose={() => setShowRisk(false)}
          security={security}
        />
      )}
    </div>
  );
}
