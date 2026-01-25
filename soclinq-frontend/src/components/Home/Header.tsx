"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBars,
  FaTimes,
  FaHome,
  FaInfoCircle,
  FaShieldAlt,
  FaUniversity,
  FaGraduationCap,
  FaHandshake,
  FaSignInAlt,
  FaUserPlus,
} from "react-icons/fa";
import "./Header.css";

export default function Header() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  // Close on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        open &&
        navRef.current &&
        toggleRef.current &&
        !navRef.current.contains(e.target as Node) &&
        !toggleRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand */}
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <img src="/logo.jpg" alt="LINQMI" />
          <span>LINQMI</span>
        </Link>

        {/* Hamburger */}
        <button
          ref={toggleRef}
          className="menu-toggle"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>

        {/* Navigation */}
        <nav ref={navRef} className={`nav ${open ? "open" : ""}`}>
          <Link
            href="/"
            className={isActive("/") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            <FaHome /> Home
          </Link>

          <Link
            href="/about"
            className={isActive("/about") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            <FaInfoCircle /> About
          </Link>

          <Link
            href="/security"
            className={isActive("/security") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            <FaShieldAlt /> Security
          </Link>

          <Link
            href="/ngo-gov"
            className={isActive("/ngo") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            <FaUniversity /> NGO / Gov
          </Link>

          <Link
            href="/education"
            className={isActive("/education") ? "active" : ""}
            onClick={() => setOpen(false)}
          >
            <FaGraduationCap /> Education
          </Link>

          <Link
            href="/partner"
            className="partner-btn"
            onClick={() => setOpen(false)}
          >
            <FaHandshake /> Partner Up
          </Link>

          <div className="auth-actions">

            <Link href="/auth/login" className="login-btn" onClick={() => setOpen(false)}>
              <FaSignInAlt /> Login
            </Link>
            <Link href="/auth/signup" className="signup-btn" onClick={() => setOpen(false)}>
              <FaSignInAlt /> Sign-Up
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
