"use client";

import React, { useState } from "react";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import "./LoginPage.css"
import { FaGoogle, FaFacebookF, FaXTwitter } from "react-icons/fa6";


const LoginPage: React.FC = () => {
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = "https://soclinqglobaltech.com/dashboard/";
  };

  return (
    <div className="auth-container" aria-live="polite">
      {/* Header */}
      <div className="auth-header">
        <h2>Welcome Back to Linqmi</h2>
        <p>Access your account</p>
      </div>
      {/* LOGIN */}
      <form
        id="loginForm"
        className="tab-content login"
        onSubmit={handleLoginSubmit}
        noValidate
      >
        <div className="input-group">
          <FaEnvelope className="left-icon" aria-hidden />
          <input type="email" placeholder="Email address" required />
        </div>

        <div className="input-group">
          <FaLock className="left-icon" aria-hidden />
          <input
            type={showLoginPassword ? "text" : "password"}
            placeholder="Password"
            required
          />
          <button
            type="button"
            className="toggle-password"
            aria-label={showLoginPassword ? "Hide password" : "Show password"}
            onClick={() => setShowLoginPassword(v => !v)}
          >
            {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <div className="forgot-password">
          <a href="https://soclinqglobaltech.com/reset-password/">
            Forgot password?
          </a>
        </div>

        <button type="submit" className="submit-btn">
          Login
        </button>

        <div className="divider">
          <span>Or continue with</span>
        </div>

        <div className="social-login">
          <button type="button" title="Continue with Google">
            <FaGoogle />
          </button>
          <button type="button" title="Continue with Facebook">
            <FaFacebookF />
          </button>
          <button type="button" title="Continue with X">
            <FaXTwitter />
          </button>
        </div>
      </form>

    </div>
  );
};

export default LoginPage;
