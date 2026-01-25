"use client";

import { useState, useRef } from "react";
import PhoneInput from "react-phone-number-input";
import Turnstile from "react-turnstile";
import { useNotify } from "../utils/NotificationContext";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { API_BASE_URL } from "../../lib/config";
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
import "./RegisterPage.css"
import "react-phone-number-input/style.css";
import { FaPlus, FaTrash, FaFilePdf } from "react-icons/fa";
import { useLoadScript } from "@react-google-maps/api";
import dynamic from "next/dynamic";

const AddressAutocomplete = dynamic(
  () => import("@/components/authenticate/AddressAutocomplete"),
  { ssr: false }
);


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
  confirmPassword: string;

  orgName: string;
  orgType: OrgType;
  orgTypeOther: string;
  house_number?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  lga?: string;
  state?: string;
  country: string;
  address: string;
  postal_code?: string;
  full_address: string;
  lat?: number;
  lng?: number;
  documents: File[];
}

/* ---------------- Validators ---------------- */

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isGmail = (email: string) =>
  email.toLowerCase().endsWith("@gmail.com");

/* ---------------- Component ---------------- */

export default function RegisterPage() {
  const notify = useNotify();
  const [role, setRole] = useState<Role>("USER");
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("IDLE");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState<"SEND" | "VERIFY" | null>(null);
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  

  const markTouched = (key: keyof typeof touched) =>
    setTouched((p) => ({ ...p, [key]: true }));
  const libraries: ("places")[] = ["places"];

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries,
  });
  

  
  const [form, setForm] = useState<RegisterForm>({
    fullName: "",
    email: "",
    phone: undefined,
    otp: "",
    password: "",
    confirmPassword: "",
    orgName: "",
    orgType: "",
    orgTypeOther: "",
    address: "",
    documents: [],
    house_number: "",
    street: "",
    neighborhood: "",
    city: "",
    lga: "",
    state: "",
    country: "",
    postal_code: "",
    full_address: "",
    lat: undefined,
    lng: undefined
  });


  const update = <K extends keyof RegisterForm>(
    key: K,
    value: RegisterForm[K]
  ) => setForm((p) => ({ ...p, [key]: value }));

  /* ---------------- OTP ---------------- */


const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_FILES = 3;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

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

  const isValidFullName = (name: string) => {
    if (!name.trim()) return false;
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return false;
    return /^[a-zA-Z\s'-]{3,}$/.test(name);
  };

  function Hint({ ok, text }: { ok: boolean; text: string }) {
    return (
      <div className={`hint ${ok ? "ok" : ""}`}>
        {ok ? <FaCheckCircle /> : <FaTimesCircle />}
        <span>{text}</span>
      </div>
    );
  }
  

  
  

  const passwordHints = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    symbol: /[\W_]/.test(form.password),
  };
  
  const removeFile = (index: number) => {
    const updated = [...form.documents];
    updated.splice(index, 1);
    update("documents", updated);
  };

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
  
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }
  
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

  const isStrongPassword = (password: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
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
  
      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP");
      }
  
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
  

  /* ---------------- Submit ---------------- */

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
  
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

    if (form.password !== form.confirmPassword) {
      notify({
        type: "error",
        title: "Passwords do not match",
        message: "Please make sure both passwords match",
        duration: 4000,
      });
      return;
    }
    
    
    
  
    const fd = new FormData();
    fd.append("role", role);
    fd.append("fullName", form.fullName);
    fd.append("email", form.email);
    fd.append("phone", form.phone || "");
    fd.append("password", form.password);
    fd.append("otp", form.otp);

    console.log(form.otp)
  
    if (role === "ORG") {
      fd.append("orgName", form.orgName);
      fd.append("orgType", form.orgType);
      fd.append("orgTypeOther", form.orgTypeOther);
      fd.append("address", form.address);
      fd.append("lat", String(form.lat ?? ""));
      fd.append("lng", String(form.lng ?? ""));

    }
  
    form.documents.forEach((file) =>
      fd.append("documents", file)
    );
  
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
    
  };
  
  /* ---------------- OAuth ---------------- */

  const loginWithGoogle = () => {
    window.location.href = "GOOGLE_AUTH_URL";
  };

  const loginWithFacebook = () => {
    window.location.href = "import.meta.env.VITE_FACEBOOK_AUTH_URL";
  };


  /* ---------------- UI ---------------- */

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Create Account</h2>
        <p>Secure registration & identity verification</p>
      </div>

      <div className="tab-buttons">
        <button
          className={role === "USER" ? "active" : ""}
          onClick={() => setRole("USER")}
        >
          User
        </button>
        <button
          className={role === "ORG" ? "active" : ""}
          onClick={() => setRole("ORG")}
        >
          NGO / Gov
        </button>
      </div>

      <form className="tab-content active" onSubmit={submit}>
        {/* Social Auth – USER ONLY */}
        {role === "USER" && (
          <>
            <div className="social-login">
              <button type="button" onClick={loginWithGoogle}>
                <FaGoogle />
              </button>
              <button type="button" onClick={loginWithFacebook}>
                <FaFacebookF />
              </button>
            </div>

            <div className="divider">
              <span>or</span>
            </div>
          </>
        )}

      <div className="input-group">
        <span className="left-icon"><FaUser /></span>

        <input
          placeholder="Full name"
          value={form.fullName}
          onBlur={() => markTouched("fullName")}
          onChange={(e) => update("fullName", e.target.value)}
        />

        {fieldState(isValidFullName(form.fullName), touched.fullName) === "valid" && (
          <FaCheckCircle className="valid-icon" />
        )}
      </div>

        {/* Email + OTP */}
        <div className="input-group">
          <span className="left-icon"><FaEnvelope /></span>
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            readOnly={otpStatus === "VERIFIED"}
            className={otpStatus === "VERIFIED" ? "readonly" : ""}
            onChange={(e) => {
              const value = e.target.value;

              // If user edits email after verification → reset OTP flow
              if (otpStatus !== "IDLE") {
                setOtpStatus("IDLE");
                update("otp", "");
              }

              update("email", value);
            }}
            required
          />

          {otpStatus === "VERIFIED" && (
            <FaCheckCircle className="valid-icon" />
          )}


          {otpStatus === "IDLE" && (
            <button
              type="button"
              className="toggle-password"
              onClick={sendOtp}
            >
              Send OTP
            </button>
          )}
        </div>

        {otpStatus === "SENT" && (
          <div className="input-group">
            <span className="left-icon"><FaShieldHalved /></span>

            <input
              placeholder="Enter OTP"
              value={form.otp}
              onChange={(e) => update("otp", e.target.value)}
            />

            <button
              type="button"
              className="toggle-password"
              onClick={verifyOtp}
              disabled={otpLoading === "VERIFY"}
            >
              {otpLoading === "VERIFY" ? "Verifying..." : "Verify"}
            </button>
          </div>
        )}


          <div className="input-phone-group">
          <span className="left-icon">
              <FaPhone />
            </span>
            <PhoneInput
              international
              defaultCountry="NG"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              countryCallingCodeEditable={false}
              placeholder="Phone number"
            />
          </div>

          <div className="input-group">
            <span className="left-icon"><FaLock /></span>

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onBlur={() => markTouched("password")}
              onChange={(e) => update("password", e.target.value)}
            />

            {fieldState(isStrongPassword(form.password), touched.password) === "valid" && (
              <FaCheckCircle className="valid-icon" />
            )}
          </div>


        <div className="password-hints">
          <Hint ok={passwordHints.length} text="At least 8 characters" />
          <Hint ok={passwordHints.upper} text="One uppercase letter" />
          <Hint ok={passwordHints.lower} text="One lowercase letter" />
          <Hint ok={passwordHints.number} text="One number" />
          <Hint ok={passwordHints.symbol} text="One special character" />
        </div>


        <div className="input-group">
          <span className="left-icon"><FaLock /></span>

          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onBlur={() => markTouched("confirmPassword")}
            onChange={(e) => update("confirmPassword", e.target.value)}
          />

          {fieldState(
            form.password === form.confirmPassword && form.confirmPassword !== "",
            touched.confirmPassword
          ) === "valid" && <FaCheckCircle className="valid-icon" />}
        </div>


        {/* ORG EXTRA */}
        {role === "ORG" && (
          <>
            <Input
              icon={<FaBuilding />}
              placeholder="Organization name"
              value={form.orgName}
              onChange={(v) => update("orgName", v)}
            />

            <div className="input-group">
              <span className="left-icon"><FaBriefcase /></span>
              <select
                value={form.orgType}
                onChange={(e) =>
                  update("orgType", e.target.value as OrgType)
                }
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
              <Input
                icon={<FaBriefcase />}
                placeholder="Specify organization type"
                value={form.orgTypeOther}
                onChange={(v) => update("orgTypeOther", v)}
              />
            )}

            {role === "ORG" && isLoaded && (
              <AddressAutocomplete
                value={form.address}
                onSelect={(addr) => {
                  update("address", addr.full_address);
                  update("street", addr.street || "");
                  update("house_number", addr.house_number || "");
                  update("city", addr.city || "");
                  update("lga", addr.lga || "");
                  update("state", addr.state || "");
                  update("country", addr.country);
                  update("postal_code", addr.postal_code || "");
                  update("lat", addr.lat);
                  update("lng", addr.lng);
                }}
            />

            
            )}


    <div className="form-field">
      <label className="field-label">Verification Documents</label>

      <div className="upload-grid">
        {/* Uploaded files */}
        {form.documents?.map((file: File, index: number) => (
          <div key={index} className="upload-box">
            <button
              type="button"
              className="remove-btn"
              onClick={() => removeFile(index)}
            >
              <FaTrash />
            </button>

            {file.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                className="preview-img"
              />
            ) : (
              <div className="pdf-box">
                <FaFilePdf />
                <span>PDF</span>
              </div>
            )}
          </div>
        ))}

        {/* Add new file */}
        {form.documents?.length < MAX_FILES && (
          <div
            className="upload-box add-box"
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
    </div>
          </>
        )}

        {/* Turnstile */}
        <Turnstile
          sitekey={"import.meta.env.VITE_TURNSTILE_SITE_KEY"}
          onVerify={(token) => setTurnstileToken(token)}
        />

        <button
          className="submit-btn"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

/* ---------------- Input ---------------- */

function Input({
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="input-group">
      <span className="left-icon">{icon}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}
