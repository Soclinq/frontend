"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { FaGoogle, FaFacebookF, FaXTwitter } from "react-icons/fa6";

import styles from "./LoginPage.module.css";
import { useUser } from "@/context/UserContext";
import { useNotify } from "@/components/utils/NotificationContext";

const LoginPage: React.FC = () => {
  const router = useRouter();
  const notify = useNotify();
  const { login } = useUser();

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      notify({
        type: "warning",
        title: "Missing fields",
        message: "Please enter your email/phone and password",
        duration: 3500,
      });
      return;
    }

    setLoading(true);

    try {
      await login(identifier.trim(), password);

      notify({
        type: "success",
        title: "Login successful",
        message: "Welcome back",
        duration: 2000,
      });

      router.push("/member");
    } catch (err: any) {
      notify({
        type: "error",
        title: "Login failed",
        message: err?.message || "Invalid credentials",
        duration: 4500,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page} aria-live="polite">
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Welcome Back to Linqmi</h2>
          <p>Access your account</p>
        </div>

        <form className={styles.form} onSubmit={handleLoginSubmit} noValidate>
          {/* Identifier */}
          <div className={styles.inputGroup}>
            <span className={styles.leftIcon}>
              <FaEnvelope aria-hidden />
            </span>

            <input
              type="text"
              placeholder="Email or phone"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <span className={styles.leftIcon}>
              <FaLock aria-hidden />
            </span>

            <input
              type={showLoginPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <span className={styles.rightSlot}>
              <button
                type="button"
                className={styles.eyeBtn}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                onClick={() => setShowLoginPassword((v) => !v)}
              >
                {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </span>
          </div>

          {/* Forgot */}
          <div className={styles.forgotPassword}>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => router.push("/reset-password")}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className={styles.divider}>
            <span>Or continue with</span>
          </div>

          {/* Social */}
          <div className={styles.socialRow}>
            <button type="button" className={styles.socialBtn} title="Continue with Google">
              <FaGoogle />
            </button>
            <button type="button" className={styles.socialBtn} title="Continue with Facebook">
              <FaFacebookF />
            </button>
            <button type="button" className={styles.socialBtn} title="Continue with X">
              <FaXTwitter />
            </button>
          </div>

          {/* Bottom nav */}
          <div className={styles.bottomNav}>
            <p className={styles.bottomText}>Don’t have an account?</p>

            <button
              type="button"
              className={styles.bottomBtn}
              onClick={() => router.push("/auth/signup")}
            >
              Create Account →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
