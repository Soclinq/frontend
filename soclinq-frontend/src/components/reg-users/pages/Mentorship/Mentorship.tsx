"use client";

import styles from "./styles/Mentorship.module.css";
import { useEffect, useReducer, useState } from "react";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";

/* ================= TYPES ================= */

type Status = "idle" | "loading" | "success" | "error";

interface MentorshipRequest {
  identityMode: "verified";
  personal: {
    fullName: string;
    age: string;
    gender: string;
    email: string;
    phone: string;
  };
  request: {
    reason: string;
    category: string;
    urgency: string;
    preferredMode: string;
    language: string;
    date: string;
    time: string;
    timezone: string;
    genderPreference: string;
    details: string;
  };
  consentShare: boolean;
  consentDisclaimer: boolean;
  createdAt: string;
  status: "new" | "assigned" | "completed";
}

/* ================= FORM STATE ================= */

const initialForm = {
  fullName: "",
  age: "",
  gender: "Prefer not to say",
  email: "",
  phone: "",
  reason: "",
  category: "Academic / Career mentorship",
  urgency: "Normal",
  preferredMode: "In App chat",
  language: "English",
  date: "",
  time: "",
  timezone: "",
  genderPreference: "No preference",
  details: "",
  consentShare: false,
  consentDisclaimer: false,
};

function reducer(state: typeof initialForm, action: any) {
  if (action.type === "RESET") return initialForm;
  return { ...state, [action.name]: action.value };
}

/* ================= COMPONENT ================= */

export default function Mentorship() {
  const [requests, setRequests] = useLocalStorage<MentorshipRequest[]>(
    "mentorship_requests",
    []
  );

  const [form, dispatch] = useReducer(reducer, initialForm);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  /* ================= AUTO TIMEZONE ================= */
  useEffect(() => {
    dispatch({
      name: "timezone",
      value: Intl.DateTimeFormat().resolvedOptions().timeZone || "Auto-detected",
    });
  }, []);

  /* ================= VALIDATION ================= */
  const validate = () => {
    if (!form.fullName) return "Full name is required";
    if (!form.email && !form.phone)
      return "Provide at least email or phone number";
    if (!form.reason) return "Reason for request is required";
    if (!form.consentShare || !form.consentDisclaimer)
      return "You must accept all consent terms";
    return "";
  };

  /* ================= PLACEHOLDER API ================= */
  const submitToServer = async (payload: MentorshipRequest) => {
    // 🔹 Replace this with real backend later
    await new Promise(res => setTimeout(res, 1200));

    return { ok: true };
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setStatus("loading");

    const payload: MentorshipRequest = {
      identityMode: "verified",
      personal: {
        fullName: form.fullName,
        age: form.age,
        gender: form.gender,
        email: form.email,
        phone: form.phone,
      },
      request: {
        reason: form.reason,
        category: form.category,
        urgency: form.urgency,
        preferredMode: form.preferredMode,
        language: form.language,
        date: form.date,
        time: form.time,
        timezone: form.timezone,
        genderPreference: form.genderPreference,
        details: form.details,
      },
      consentShare: form.consentShare,
      consentDisclaimer: form.consentDisclaimer,
      createdAt: new Date().toISOString(),
      status: "new",
    };

    try {
      const res = await submitToServer(payload);

      if (!res.ok) throw new Error("Submission failed");

      setRequests([...requests, payload]);
      setStatus("success");
      dispatch({ type: "RESET" });
    } catch (err: any) {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  /* ================= UI ================= */

  return (
    <section className={styles.mentorship}>
      <header className={styles.header}>
        <h1>Mentorship / Counselling</h1>
        <p>Request professional or peer support confidentially</p>
      </header>

      <form className={styles.form} onSubmit={e => e.preventDefault()}>
        <fieldset disabled={status === "loading"}>
          <legend>Identity Mode</legend>
          <select disabled>
            <option>Verified (real identity)</option>
          </select>
        </fieldset>

        <fieldset disabled={status === "loading"}>
          <legend>Personal Information</legend>
          <div className={styles.grid}>
            <input placeholder="Full Name" value={form.fullName}
              onChange={e => dispatch({ name: "fullName", value: e.target.value })} />
            <input placeholder="Age / DOB" value={form.age}
              onChange={e => dispatch({ name: "age", value: e.target.value })} />
            <select value={form.gender}
              onChange={e => dispatch({ name: "gender", value: e.target.value })}>
              <option>Female</option>
              <option>Male</option>
              <option>Prefer not to say</option>
            </select>
            <input placeholder="Email" value={form.email}
              onChange={e => dispatch({ name: "email", value: e.target.value })} />
            <input placeholder="Phone" value={form.phone}
              onChange={e => dispatch({ name: "phone", value: e.target.value })} />
          </div>
        </fieldset>

        <fieldset disabled={status === "loading"}>
          <legend>Request Details</legend>
          <div className={styles.grid}>
            <input placeholder="Reason for request" value={form.reason}
              onChange={e => dispatch({ name: "reason", value: e.target.value })} />
            <select value={form.category}
              onChange={e => dispatch({ name: "category", value: e.target.value })}>
              <option>Academic / Career mentorship</option>
              <option>Psychological counselling</option>
              <option>Family / Relationship issues</option>
              <option>Trauma recovery</option>
              <option>Other</option>
            </select>

            <select value={form.urgency}
              onChange={e => dispatch({ name: "urgency", value: e.target.value })}>
              <option>Normal</option>
              <option>Priority</option>
              <option>Emergency</option>
            </select>

            <textarea placeholder="Additional details"
              value={form.details}
              onChange={e => dispatch({ name: "details", value: e.target.value })} />
          </div>
        </fieldset>

        <fieldset disabled={status === "loading"}>
          <legend>Consent</legend>
          <label>
            <input type="checkbox" checked={form.consentShare}
              onChange={e => dispatch({ name: "consentShare", value: e.target.checked })} />
            I consent to data sharing with assigned mentors only.
          </label>
          <label>
            <input type="checkbox" checked={form.consentDisclaimer}
              onChange={e =>
                dispatch({ name: "consentDisclaimer", value: e.target.checked })
              } />
            This does not replace professional medical/legal services.
          </label>
        </fieldset>

        {error && <p className={styles.error}>{error}</p>}
        {status === "success" && (
          <p className={styles.success}>Request submitted successfully ✔</p>
        )}

        <div className={styles.actions}>
          <button onClick={handleSubmit} disabled={status === "loading"}>
            {status === "loading" ? "Submitting..." : "Submit Request"}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "RESET" })}
            disabled={status === "loading"}
          >
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}
