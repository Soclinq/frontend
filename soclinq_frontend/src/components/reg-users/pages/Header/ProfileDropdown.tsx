"use client";

import { useEffect, useRef, useState } from "react";
import {
  MdPersonOutline,
  MdSettings,
  MdLogout,
} from "react-icons/md";
import { useUser } from "@/context/UserContext";
import styles from "./styles/ProfileDropdown.module.css";

interface ProfileDropdownProps {
  onProfile: () => void;
}

export default function ProfileDropdown({ onProfile }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { user, logout } = useUser();

  /* ================= CLOSE DROPDOWN ON OUTSIDE CLICK ================= */
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* ================= HANDLERS ================= */
  const handleProfile = () => {
    setOpen(false);
    onProfile(); // ✅ delegate navigation to parent
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={`${styles.iconBtn} ${open ? styles.active : ""}`}
        aria-label="Profile"
        onClick={() => setOpen((v) => !v)}
      >
        <MdPersonOutline size={20} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          {/* ===== USER SUMMARY ===== */}
          <button
            className={styles.profile}
            onClick={handleProfile}
          >
            <div className={styles.avatar}>
              {user?.photo ? (
                <img src={user.photo} alt="Profile" />
              ) : (
                user?.fullName?.charAt(0) || "U"
              )}
            </div>

            <div>
              <p className={styles.name}>
                {user?.fullName || "User"}
              </p>
              <span className={styles.role}>
                {user?.role || "Member"}
              </span>
            </div>
          </button>

          {/* ===== SETTINGS ===== */}
          <button
            className={styles.item}
            onClick={handleProfile}
          >
            <MdSettings size={18} />
            Profile & Settings
          </button>

          {/* ===== LOGOUT ===== */}
          <button
            className={`${styles.item} ${styles.danger}`}
            onClick={handleLogout}
          >
            <MdLogout size={18} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
