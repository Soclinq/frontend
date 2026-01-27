"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./styles/Home.module.css";

/* ================= HOOKS ================= */
import { useGeolocation } from "@/hooks/useGeolocation";
import { useUser } from "@/context/UserContext";
import { useNotify } from "@/components/utils/NotificationContext";
import LiveStreamSection from "./LiveStreamSection";

/* ================= API ================= */
import { authFetch } from "@/lib/authFetch";

/* ================= COMPONENTS ================= */
import SosControls from "../Sos/SosControls";
import SosMap from "../Sos/SosMap";

/* ================= ICONS ================= */
import {
  MdLiveTv,
  MdCampaign,
  MdMap,
  MdSend,
  MdReport,
  MdLocalFireDepartment,
  MdMedicalServices,
  MdHowToVote,
} from "react-icons/md";

/* ================= TYPES ================= */

type ReportType = "Crime" | "Fire" | "Medical" | "Election Report";

type BackendReport = {
  id: string;
  type: ReportType;
  urgency?: "Low" | "Medium" | "High";
  description: string;
  anonymous?: boolean;
  createdAt: string;
};

type BackendSos = {
  id: string;
  lat: number;
  lng: number;
  note?: string;
  risk?: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
};


export default function Home() {
  const notify = useNotify();
  const { user, loading: authLoading, isAuthenticated, refresh } = useUser();
  const { getLocation } = useGeolocation();

  /* ================= UI STATE ================= */

  const [reportType, setReportType] = useState<ReportType>("Crime");
  const [desc, setDesc] = useState("");

  const [reports, setReports] = useState<BackendReport[]>([]);
  const [sosList, setSosList] = useState<BackendSos[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [sendingSOS, setSendingSOS] = useState(false);

  /* ================= DERIVED ================= */

  const reportIcon = useMemo(() => {
    if (reportType === "Crime") return <MdReport />;
    if (reportType === "Fire") return <MdLocalFireDepartment />;
    if (reportType === "Medical") return <MdMedicalServices />;
    return <MdHowToVote />;
  }, [reportType]);

  const activeSosCount = useMemo(() => sosList.length, [sosList]);

  /* ================= API HELPERS ================= */

  const loadHomeData = async () => {
    setPageLoading(true);

    try {
      // If your backend requires auth, ensure user session is loaded
      await refresh();

      // ✅ Fetch reports
      const reportsRes = await authFetch("/reports/");
      const reportsJson = await reportsRes.json().catch(() => ({}));

      if (!reportsRes.ok) {
        throw new Error(reportsJson?.error || "Failed to load reports");
      }

      // ✅ Fetch SOS
      const sosRes = await authFetch("/sos/");
      const sosJson = await sosRes.json().catch(() => ({}));

      if (!sosRes.ok) {
        throw new Error(sosJson?.error || "Failed to load SOS data");
      }

      setReports(reportsJson?.items || reportsJson?.reports || []);
      setSosList(sosJson?.items || sosJson?.sos || []);
    } catch (err: any) {
      notify({
        type: "error",
        title: "Failed to load dashboard",
        message: err?.message || "Network error",
        duration: 4500,
      });
    } finally {
      setPageLoading(false);
    }
  };

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    loadHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= ACTIONS ================= */

  const submitReport = async () => {
    const value = desc.trim();

    if (!value) {
      notify({
        type: "warning",
        title: "Missing description",
        message: "Please describe what happened.",
        duration: 3500,
      });
      return;
    }

    setSubmittingReport(true);

    try {
      const res = await authFetch("/reports/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          urgency: "Medium",
          description: value,
          anonymous: true,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Report submission failed");
      }

      notify({
        type: "success",
        title: "Report submitted",
        message: "✅ Your report has been received.",
        duration: 3500,
      });

      setDesc("");

      // Optimistic update if backend returns report
      if (data?.report) {
        setReports((prev) => [data.report, ...prev]);
      } else {
        // fallback refresh
        await loadHomeData();
      }
    } catch (err: any) {
      notify({
        type: "error",
        title: "Report failed",
        message: err?.message || "Unable to submit report",
        duration: 4500,
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const sendSOS = async () => {
    setSendingSOS(true);

    try {
      const loc = await getLocation();

      const res = await authFetch("/sos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: loc.latitude,
          lng: loc.longitude,
          note: "Emergency SOS",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "SOS failed");
      }

      notify({
        type: "success",
        title: "SOS sent",
        message: "✅ Emergency SOS has been sent successfully.",
        duration: 3500,
      });

      // Add to list immediately if backend returns item
      if (data?.sos) {
        setSosList((prev) => [data.sos, ...prev]);
      } else {
        await loadHomeData();
      }
    } catch (err: any) {
      notify({
        type: "error",
        title: "SOS failed",
        message: err?.message || "Location unavailable or request failed",
        duration: 4500,
      });
    } finally {
      setSendingSOS(false);
    }
  };

  /* ================= AUTH GUARD UX ================= */

  if (authLoading || pageLoading) {
    return (
      <section className={styles.home}>
        <header className={styles.hero}>
          <h1 className={styles.title}>LINQMI Safety Hub</h1>
          <p className={styles.subtitle}>Loading your dashboard...</p>
        </header>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className={styles.home}>
        <header className={styles.hero}>
          <h1 className={styles.title}>LINQMI Safety Hub</h1>
          <p className={styles.subtitle}>
            Please login to access reports, SOS and live features.
          </p>

          <button
            className={styles.primaryBtn}
            onClick={() => (window.location.href = "/auth/login")}
          >
            Go to Login →
          </button>
        </header>
      </section>
    );
  }

  /* ================= UI ================= */

  return (
    <section className={styles.home}>
      {/* ================= HERO ================= */}
      <header className={styles.hero}>
        <h1 className={styles.title}>LINQMI Safety Hub</h1>

        <p className={styles.subtitle}>
          Welcome, <strong>{user?.fullName}</strong> — Real-time emergency response & alerts.
        </p>

        {/* You can pass sendSOS into SosControls if you want */}

      </header>

      <SosControls />

      {/* ================= LIVE ================= */}
      <LiveStreamSection />
      {/* ================= STATS ================= */}
      <section className={styles.stats}>
        <div className={styles.statCard}>
          <strong>{reports.length}</strong>
          <span>Reports Filed</span>
        </div>

        <div className={styles.statCard}>
          <strong>{activeSosCount}</strong>
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
              <span className={styles.selectIcon}>{reportIcon}</span>

              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
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
              rows={4}
            />
          </label>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={submitReport}
            disabled={submittingReport}
          >
            <MdSend />
            {submittingReport ? "Submitting..." : "Submit Report"}
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={sendSOS}
            disabled={sendingSOS}
          >
            <MdMap />
            {sendingSOS ? "Sending SOS..." : "Send SOS (with GPS)"}
          </button>
        </div>

        {/* MAP */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <MdMap /> Real-Time SOS Map
          </h3>

          {/* SosMap can accept center prop if you want */}
          <SosMap/>
        </div>
      </section>
    </section>
  );
}
