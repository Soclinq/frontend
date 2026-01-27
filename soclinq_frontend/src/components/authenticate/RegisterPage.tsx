"use client";

import { useMemo, useRef, useState } from "react";
import PhoneInput from "react-phone-number-input";
import Turnstile from "react-turnstile";
import { useNotify } from "../utils/NotificationContext";
import { API_BASE_URL } from "../../lib/config";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useRouter } from "next/navigation";

import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaBuilding,
  FaBriefcase,
  FaPhone,
  FaShieldHalved,
  FaGoogle,
  FaFacebookF,
} from "react-icons/fa6";

import { FaCheckCircle, FaTimesCircle, FaPlus, FaTrash, FaFilePdf } from "react-icons/fa";

import "react-phone-number-input/style.css";
import styles from "./RegisterPage.module.css";

/* ---------------- Types ---------------- */

type Role = "USER" | "ORG";
type OtpStatus = "IDLE" | "SENT" | "VERIFIED";

type OrgType =
  | "NGO"
  | "GOVERNMENT"
  | "NON_PROFIT"
  | "COMMUNITY"
  | "OTHER"
  | "";

type FieldState = "idle" | "valid" | "invalid";

const fieldState = (condition: boolean, touched: boolean): FieldState => {
  if (!touched) return "idle";
  return condition ? "valid" : "invalid";
};

interface RegisterForm {
  fullName: string;
  email: string;
  phone?: string;
  otp: string;
  password: string;

  orgName: string;
  orgType: OrgType;
  orgTypeOther: string;

  address: string;
  country: string;
  full_address: string;
  lat?: number;
  lng?: number;

  documents: File[];
}

/* ---------------- Validators ---------------- */

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

const isValidFullName = (name: string) => {
  if (!name.trim()) return false;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;
  return /^[a-zA-Z\s'-]{3,}$/.test(name);
};

/* ---------------- Nominatim Types ---------------- */

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

/* ---------------- Component ---------------- */

export default function RegisterPage() {
  const notify = useNotify();
  const router = useRouter();


  const [role, setRole] = useState<Role>("USER");
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("IDLE");
  const [loading, setLoading] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState<"SEND" | "VERIFY" | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const [touched, setTouched] = useState({
    fullName: false,
    password: false,
  });

  const markTouched = (key: keyof typeof touched) =>
    setTouched((p) => ({ ...p, [key]: true }));

  const [form, setForm] = useState<RegisterForm>({
    fullName: "",
    email: "",
    phone: undefined,
    otp: "",
    password: "",

    orgName: "",
    orgType: "",
    orgTypeOther: "",

    address: "",
    country: "",
    full_address: "",
    lat: undefined,
    lng: undefined,

    documents: [],
  });

  const update = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  /* ---------------- Files ---------------- */

  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const MAX_FILES = 3;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const existing = form.documents;
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        notify({
          type: "error",
          title: "Invalid file",
          message: `${file.name}: Unsupported file type`,
          duration: 4000,
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        notify({
          type: "error",
          title: "File too large",
          message: `${file.name} exceeds 2MB`,
          duration: 4000,
        });
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) return;

    const merged = [...existing, ...validFiles].slice(0, MAX_FILES);
    update("documents", merged);
  };

  const removeFile = (index: number) => {
    const updated = [...form.documents];
    updated.splice(index, 1);
    update("documents", updated);
  };

  /* ---------------- Password Hints ---------------- */

  const passwordHints = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    symbol: /[\W_]/.test(form.password),
  };

  function Hint({ ok, text }: { ok: boolean; text: string }) {
    return (
      <div className={`${styles.hint} ${ok ? styles.hintOk : ""}`}>
        {ok ? <FaCheckCircle /> : <FaTimesCircle />}
        <span>{text}</span>
      </div>
    );
  }

  /* ---------------- OTP ---------------- */

  const sendOtp = async () => {
    if (!isValidEmail(form.email)) {
      notify({
        type: "error",
        title: "Invalid email",
        message: "Enter a valid email address",
        duration: 4000,
      });
      return;
    }

    setOtpLoading("SEND");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/send-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: form.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setOtpStatus("SENT");

      notify({
        type: "success",
        title: "OTP sent",
        message: "Check your email for the verification code",
        duration: 4000,
      });
    } catch (err: any) {
      notify({
        type: "error",
        title: "OTP failed",
        message: err.message,
        duration: 5000,
      });
    } finally {
      setOtpLoading(null);
    }
  };

  const verifyOtp = async () => {
    if (!form.otp) return;

    setOtpLoading("VERIFY");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: form.email,
          otp: form.otp,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      setOtpStatus("VERIFIED");

      notify({
        type: "success",
        title: "Verified",
        message: "Email verification successful",
        duration: 4000,
      });
    } catch (err: any) {
      notify({
        type: "error",
        title: "Verification failed",
        message: err.message,
        duration: 5000,
      });
    } finally {
      setOtpLoading(null);
    }
  };

  /* ---------------- Open Source Address Search (Nominatim) ---------------- */

  const [addrQuery, setAddrQuery] = useState("");
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrResults, setAddrResults] = useState<NominatimResult[]>([]);
  const [addrOpen, setAddrOpen] = useState(false);

  const searchTimerRef = useRef<number | null>(null);

  const searchAddress = (value: string) => {
    setAddrQuery(value);

    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);

    if (!value.trim() || value.trim().length < 3) {
      setAddrResults([]);
      setAddrOpen(false);
      return;
    }

    searchTimerRef.current = window.setTimeout(async () => {
      setAddrLoading(true);

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          value
        )}&addressdetails=1&limit=6`;

        const res = await fetch(url, {
          headers: {
            "Accept": "application/json",
          },
        });

        const data = (await res.json()) as NominatimResult[];
        setAddrResults(data || []);
        setAddrOpen(true);
      } catch {
        setAddrResults([]);
        setAddrOpen(false);
      } finally {
        setAddrLoading(false);
      }
    }, 450);
  };

  const selectAddress = (r: NominatimResult) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);

    update("address", r.display_name);
    update("full_address", r.display_name);
    update("lat", lat);
    update("lng", lng);

    // best guess
    update("country", "Nigeria");

    setAddrQuery(r.display_name);
    setAddrOpen(false);

    notify({
      type: "success",
      title: "Address selected",
      message: "Location captured successfully",
      duration: 3000,
    });
  };

  /* ---------------- Submit ---------------- */

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // if (!turnstileToken) {
    //   notify({
    //     type: "warning",
    //     title: "Captcha required",
    //     message: "Please complete the verification box",
    //     duration: 4000,
    //   });
    //   return;
    // }

    if (otpStatus !== "VERIFIED") {
      notify({
        type: "warning",
        title: "Verification required",
        message: "Please verify your email before submitting",
        duration: 5000,
      });
      return;
    }

    if (!isValidFullName(form.fullName)) {
      notify({
        type: "error",
        title: "Invalid name",
        message: "Please enter your full name (first & last name)",
        duration: 4000,
      });
      return;
    }

    if (!isStrongPassword(form.password)) {
      notify({
        type: "error",
        title: "Weak password",
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol",
        duration: 6000,
      });
      return;
    }

    if (role === "ORG" && (!form.address.trim() || !form.lat || !form.lng)) {
      notify({
        type: "warning",
        title: "Organization address required",
        message: "Please search and select a valid address from the list",
        duration: 5000,
      });
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("role", role);
      fd.append("fullName", form.fullName);
      fd.append("email", form.email);
      fd.append("phone", form.phone || "");
      fd.append("password", form.password);
      fd.append("otp", form.otp);

      if (role === "ORG") {
        fd.append("orgName", form.orgName);
        fd.append("orgType", form.orgType);
        fd.append("orgTypeOther", form.orgTypeOther);

        fd.append("address", form.address);
        fd.append("lat", String(form.lat ?? ""));
        fd.append("lng", String(form.lng ?? ""));
      }

      form.documents.forEach((file) => fd.append("documents", file));

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register/`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        notify({
          type: "error",
          title: "Registration failed",
          message: err.error || "Unable to create account",
          duration: 5000,
        });
        return;
      }

      notify({
        type: "success",
        title: "Account created",
        message: "Your account has been created successfully",
        duration: 5000,
      });
      if (role === "ORG") {
        router.push("/ngo-org");
      } else {
        router.push("/member");
      }
      
    } catch (err: any) {
      notify({
        type: "error",
        title: "Error",
        message: err.message || "Something went wrong",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OAuth ---------------- */

  const loginWithGoogle = () => {
    window.location.href = "GOOGLE_AUTH_URL";
  };

  const loginWithFacebook = () => {
    window.location.href = "FACEBOOK_AUTH_URL";
  };

  /* ---------------- UI ---------------- */

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Create Account</h2>
          <p>Secure registration & identity verification</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${role === "USER" ? styles.tabActive : ""}`}
            onClick={() => setRole("USER")}
          >
            User
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${role === "ORG" ? styles.tabActive : ""}`}
            onClick={() => setRole("ORG")}
          >
            NGO / Gov
          </button>
        </div>

        <form className={styles.form} onSubmit={submit}>
          {/* Social login */}
          {role === "USER" && (
            <>
              <div className={styles.socialRow}>
                <button type="button" className={styles.socialBtn} onClick={loginWithGoogle}>
                  <FaGoogle />
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  className={styles.socialBtn}
                  onClick={loginWithFacebook}
                >
                  <FaFacebookF />
                  <span>Facebook</span>
                </button>
              </div>

              <div className={styles.divider}>
                <span>or</span>
              </div>
            </>
          )}

          {/* Full Name */}
          <Field
            icon={<FaUser />}
            placeholder="Full name"
            value={form.fullName}
            onBlur={() => markTouched("fullName")}
            onChange={(v) => update("fullName", v)}
            right={
              fieldState(isValidFullName(form.fullName), touched.fullName) === "valid" ? (
                <FaCheckCircle className={styles.validIcon} />
              ) : null
            }
          />

          {/* Email + OTP */}
          <div className={styles.inputGroup}>
            <span className={styles.leftIcon}>
              <FaEnvelope />
            </span>

            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              readOnly={otpStatus === "VERIFIED"}
              className={otpStatus === "VERIFIED" ? styles.readonly : ""}
              onChange={(e) => {
                const value = e.target.value;

                if (otpStatus !== "IDLE") {
                  setOtpStatus("IDLE");
                  update("otp", "");
                }

                update("email", value);
              }}
              required
            />

            <span className={styles.rightSlot}>
              {otpStatus === "VERIFIED" ? (
                <FaCheckCircle className={styles.validIcon} />
              ) : otpStatus === "IDLE" ? (
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={sendOtp}
                  disabled={otpLoading === "SEND"}
                >
                  {otpLoading === "SEND" ? "Sending..." : "Send OTP"}
                </button>
              ) : null}
            </span>
          </div>

          {otpStatus === "SENT" && (
            <div className={styles.inputGroup}>
              <span className={styles.leftIcon}>
                <FaShieldHalved />
              </span>

              <input
                placeholder="Enter OTP"
                value={form.otp}
                onChange={(e) => update("otp", e.target.value)}
              />

              <span className={styles.rightSlot}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={verifyOtp}
                  disabled={otpLoading === "VERIFY"}
                >
                  {otpLoading === "VERIFY" ? "Verifying..." : "Verify"}
                </button>
              </span>
            </div>
          )}

          {/* Phone */}
          <div className={styles.phoneGroup}>
            <span className={styles.leftIcon}>
              <FaPhone />
            </span>

            <div className={styles.phoneWrap}>
              <PhoneInput
                international
                defaultCountry="NG"
                value={form.phone}
                onChange={(v) => update("phone", v)}
                countryCallingCodeEditable={false}
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Password */}
          <div
            className={`${styles.inputGroup} ${
              fieldState(isStrongPassword(form.password), touched.password) === "invalid"
                ? styles.inputInvalid
                : ""
            }`}
          >
            <span className={styles.leftIcon}>
              <FaLock />
            </span>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onBlur={() => markTouched("password")}
              onChange={(e) => update("password", e.target.value)}
            />

            <span className={styles.rightSlot}>
              

              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {fieldState(isStrongPassword(form.password), touched.password) === "valid" ? (
                <FaCheckCircle className={styles.validIcon} />
              ) : null}
            </span>
          </div>

          <div className={styles.hints}>
            <Hint ok={passwordHints.length} text="At least 8 characters" />
            <Hint ok={passwordHints.upper} text="One uppercase letter" />
            <Hint ok={passwordHints.lower} text="One lowercase letter" />
            <Hint ok={passwordHints.number} text="One number" />
            <Hint ok={passwordHints.symbol} text="One special character" />
          </div>

          {/* ORG extras */}
          {role === "ORG" && (
            <>
              <Field
                icon={<FaBuilding />}
                placeholder="Organization name"
                value={form.orgName}
                onChange={(v) => update("orgName", v)}
              />

              <div className={styles.inputGroup}>
                <span className={styles.leftIcon}>
                  <FaBriefcase />
                </span>

                <select
                  value={form.orgType}
                  onChange={(e) => update("orgType", e.target.value as OrgType)}
                >
                  <option value="">Select organization type</option>
                  <option value="NGO">NGO</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="NON_PROFIT">Non-profit</option>
                  <option value="COMMUNITY">Community</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {form.orgType === "OTHER" && (
                <Field
                  icon={<FaBriefcase />}
                  placeholder="Specify organization type"
                  value={form.orgTypeOther}
                  onChange={(v) => update("orgTypeOther", v)}
                />
              )}

              {/* ✅ Open-source address search */}
              <div className={styles.block}>
                <label className={styles.label}>Organization Address</label>

                <div className={styles.addrBox}>
                  <div className={styles.inputGroup}>
                    <span className={styles.leftIcon}>
                      <FaBuilding />
                    </span>

                    <input
                      value={addrQuery}
                      placeholder="Search address (OpenStreetMap)"
                      onChange={(e) => searchAddress(e.target.value)}
                      onFocus={() => {
                        if (addrResults.length > 0) setAddrOpen(true);
                      }}
                    />

                    <span className={styles.rightSlot}>
                      {addrLoading ? (
                        <span className={styles.smallLoading}>Searching...</span>
                      ) : null}
                    </span>
                  </div>

                  {addrOpen && addrResults.length > 0 && (
                    <div className={styles.addrResults}>
                      {addrResults.map((r) => (
                        <button
                          key={r.place_id}
                          type="button"
                          className={styles.addrItem}
                          onClick={() => selectAddress(r)}
                        >
                          {r.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {form.lat && form.lng ? (
                  <p className={styles.miniNote}>
                    ✅ Location captured: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                  </p>
                ) : (
                  <p className={styles.miniNote}>
                    Tip: select from suggestions to capture GPS coordinates.
                  </p>
                )}
              </div>

              {/* Documents */}
              <div className={styles.block}>
                <label className={styles.label}>Verification Documents</label>

                <div className={styles.uploadGrid}>
                  {form.documents.map((file, index) => (
                    <div key={index} className={styles.uploadBox}>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeFile(index)}
                      >
                        <FaTrash />
                      </button>

                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className={styles.previewImg}
                        />
                      ) : (
                        <div className={styles.pdfBox}>
                          <FaFilePdf />
                          <span>PDF</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {form.documents.length < MAX_FILES && (
                    <div
                      className={`${styles.uploadBox} ${styles.addBox}`}
                      onClick={() => inputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                      }}
                    >
                      <FaPlus />
                      <span>Add file</span>

                      <input
                        ref={inputRef}
                        type="file"
                        multiple
                        hidden
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => {
                          handleFiles(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>

                <p className={styles.miniNote}>
                  Max {MAX_FILES} files • JPG/PNG/PDF • 2MB each
                </p>
              </div>
            </>
          )}

          {/* Turnstile */}
          <div className={styles.turnstileWrap}>
            <Turnstile
              sitekey={"YOUR_TURNSTILE_SITE_KEY"}
              onVerify={(token) => setTurnstileToken(token)}
            />
          </div>

          {/* Submit */}
          <button className={styles.submitBtn} disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <div className={styles.bottomNav}>
          <p className={styles.bottomText}>
            Already have an account?
          </p>

          <button
            type="button"
            className={styles.loginBtn}
            onClick={() => (window.location.href = "/auth/login")}
          >
            Go to Login →
          </button>
        </div>

      </div>
    </div>
  );
}

/* ---------------- Reusable Field ---------------- */

function Field({
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  onBlur,
  right,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  onBlur?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className={styles.inputGroup}>
      <span className={styles.leftIcon}>{icon}</span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        required
      />

      {right ? <span className={styles.rightSlot}>{right}</span> : null}
    </div>
  );
}
