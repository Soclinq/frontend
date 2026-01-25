// components/MobileSecuritySection.tsx
"use client"

import React from "react"
import { useEffect, useRef, useState } from "react";
import {
  FiMapPin,
  FiShield,
  FiAlertTriangle,
  FiEyeOff,
  FiWifi,
  FiBatteryCharging
} from "react-icons/fi";
import { IoCellular } from "react-icons/io5";
import { MdWarning } from "react-icons/md";
import "./MobileSecurity.css";

const MobileSecuritySection: React.FC = () => {
    const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState("");


  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setTime(formatted);
    };

    updateTime(); // initial
    const interval = setInterval(updateTime, 60_000); // update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mobile-security slanted-section">
      <div className="mobile-security-container fade-in">
        {/* LEFT */}
        <div className="mobile-security-content">
          <span className="section-badge">LINQMI MOBILE</span>

          <h2 className="mobile-security-title">
            Security in Your Pocket
          </h2>

          <p className="mobile-security-description">
            Don’t wait for an emergency. Access advanced community policing,
            real-time alerts, and secure anonymous reporting — anywhere.
          </p>

          {/* Feature Navigation */}
          <div className="feature-nav">
            <div className="feature-item">
              <FiMapPin />
              Live Tracking
            </div>
            <div className="feature-item">
              <FiShield />
              Geo-Fencing
            </div>
            <div className="feature-item">
              <FiAlertTriangle />
              Instant SOS
            </div>
            <div className="feature-item">
              <FiEyeOff />
              Anonymous
            </div>
          </div>

          {/* Store Badges */}
          <div className="store-badges">
  <a
    href="#"
    target="_blank"
    rel="noopener noreferrer"
    className="store-btn google"
    aria-label="Get it on Google Play"
  >
    <img src="/playstore.png" alt="Google Play" />
    <div className="store-text">
      <span className="small">GET IT ON</span>
      <span className="big">Google Play</span>
    </div>
  </a>

  <a
    href="#"
    target="_blank"
    rel="noopener noreferrer"
    className="store-btn apple"
    aria-label="Download on the App Store"
  >
    <img src="/apple.png" alt="Apple App Store" />
    <div className="store-text">
      <span className="small">Download on the</span>
      <span className="big">App Store</span>
    </div>
  </a>
</div>


        </div>

        {/* RIGHT */}
        <div
      ref={ref}
      className={`phone-section ${visible ? "show" : ""}`}
    >
      <div className="iphone">
        {/* Camera Island */}
        <div className="dynamic-island">
            <span className="camera-dot" />
            <span className="sensor-dot" />
            </div>


        {/* Screen */}
        <div className="iphone-screen">
          {/* Status Bar */}
          <div className="status-bar">
            <span className="time">{time}</span>
            <div className="status-icons">
              <IoCellular />
              <FiWifi />
              <FiBatteryCharging />
            </div>
          </div>

          {/* App Content */}
          <div className="screen-content">
            <h4>LINQMI</h4>
            <p>Community-powered safety</p>

            <div className="sos-card">
              <MdWarning />
              <div>
                <strong>SOS Sent</strong>
                <span>Community alerted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </section>
  );
};

export default MobileSecuritySection;
