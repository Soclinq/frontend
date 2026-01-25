"use client";

import Link from "next/link";
import styles from "@/styles/Layout.module.css";

export default function MobileBottomNav() {
  return (
    <nav className={styles.bottomNav}>
      <Link href="/">Home</Link>
      <Link href="/report">Report</Link>
      <Link href="/sos"><b>SOS</b></Link>
      <Link href="/community">Community</Link>
      <Link href="/profile">Profile</Link>
    </nav>
  );
}
