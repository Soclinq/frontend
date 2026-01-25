"use client";

import Link from "next/link";
import styles from "@/styles/Sidebar.module.css";

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/report">Report</Link>
          <Link href="/sos">SOS</Link>
          <Link href="/community">Community</Link>
          <Link href="/tracking">Tracking</Link>
          <Link href="/geo">Geospatial</Link>
          <Link href="/mentorship">Mentorship</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </aside>

      {open && <div className={styles.overlay} onClick={onClose} />}
    </>
  );
}
